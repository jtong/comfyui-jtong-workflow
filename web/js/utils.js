import { ComfyDialog } from "../../../scripts/ui.js";
export function error_popup(msg) {
	let dialog = new ComfyDialog();
	dialog.show(`<p>${msg}</p>`);
}

export function is_promise(obj) {
	return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

export function is_async(func) {
	return func.constructor.name === "AsyncFunction";
}

export const HIJACK_MARK = Symbol("hijack_mark");

function hijack_evt(evt_obj, pass_obj, mode) {
	for (let i = 0; i < evt_obj.evt.length; ++ i)
		evt_obj.evt[i].call(pass_obj, mode);
}

export function hijack(obj, key, func, evt) {
	// The most convoluted hijacking mechanism ever
	const old_func = obj[key] ?? (() => {}),
		evt_obj = old_func[HIJACK_MARK] ?? {
			evt: [],
		};

	obj[key] = function(...args) {
		const self = this;
		const pass_obj = {
			self: self,
			stop: false,
			func: func,
			old: old_func,
			args: args,
			wait: is_async(old_func) || is_async(func),
		};

		const exec_after = () => {
			hijack_evt(evt_obj, pass_obj, 0b10000);
			const after_result = func.apply(pass_obj, args);
			hijack_evt(evt_obj, pass_obj, 0b100000);

			if (is_promise(after_result))
				// return after_result.then(() => pass_obj.res);
				return after_result.then(() => {
					hijack_evt(evt_obj, pass_obj, 0b100000000);
					return pass_obj.res;
				});
			return pass_obj.res;
		};

		const exec_old = () => {
			if (pass_obj.old !== old_func || pass_obj.stop) {
				hijack_evt(evt_obj, pass_obj, 0b1000000);
				if (is_promise(pass_obj.res))
					// return pass_obj.res.then(exec_after);
					return pass_obj.res.then(res => {
						pass_obj.res = res;
						hijack_evt(evt_obj, pass_obj, 0b10000000);
						return exec_after();
					});
				return exec_after();
			}

			hijack_evt(evt_obj, pass_obj, 0b100);
			const result = old_func.apply(self, args);
			hijack_evt(evt_obj, pass_obj, 0b1000);

			if (is_promise(result))
				return result.then(res => {
					pass_obj.res = res;
					return exec_after();
				});
			pass_obj.res = result;
			return exec_after();
		};

		hijack_evt(evt_obj, pass_obj, 0b1);
		const before_result = func.apply(pass_obj, args);
		hijack_evt(evt_obj, pass_obj, 0b10);

		pass_obj.mark = true;
		if (is_promise(before_result))
			return before_result.then(exec_old);
		return exec_old();
	};

	obj[key][HIJACK_MARK] = evt_obj;

	if (evt)
		obj[key][HIJACK_MARK].evt.push(evt);

	return old_func;
}

export function clone_class(original) {
	return class extends original {
		constructor(...args) {
			super(...args);
		}
	};
}
export function random_id() {
	return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
export function indent_str(strings, ...values) {
	// Build the string as normal, combining all parts
	let fullString = strings.reduce((acc, str, i) => acc + (values[i - 1] || '') + str);

	// Split the string into lines
	let lines = fullString.split('\n');

	// Remove the first line if it is empty (caused by a newline at the beginning of a template literal)
	if (lines[0].match(/^\s*$/))
		lines.shift();

	// Find the smallest indentation (spaces or tabs) from the remaining lines that have content
	const smallestIndent = lines.length > 0
		? Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^[ \t]*/)[0].length))
		: 0;

	// Remove the smallest indentation from all lines
	lines = lines.map(line => line.substring(smallestIndent));

	// Combine the trimmed lines
	return lines.join('\n');
}
