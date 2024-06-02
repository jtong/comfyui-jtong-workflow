import ast
import subprocess
import sys

natsort = None
try:
	natsort = __import__("natsort")
except:
	subprocess.Popen([sys.executable, "-m", "pip", "install", "natsort"]).wait()
	natsort = __import__("natsort")

BLACKLIST = [
	"_way_in",
	"_way_out",
	"_junc_in",
	"_junc_out",
	"..."
]

######################################################################################
######################################## HACK ########################################
######################################################################################

class TautologyStr(str):
	def __ne__(self, other):
		return False

class ByPassTypeTuple(tuple):
	def __getitem__(self, index):
		if index > 0:
			index = 0
		item = super().__getitem__(index)
		if isinstance(item, str):
			return TautologyStr(item)
		return item



######################################################################################
######################################## UTIL ########################################
######################################################################################


class RevisionDict(dict):
	def __init__(self, *args, **kwargs):
		self.update(*args, **kwargs)

	def path_count(self, path):
		count = 0
		for key in self.keys():
			if key[0:len(path)] == path:
				count += 1
		return count
	
	def path_exists(self, path):
		for key in self.keys():
			if key[0:len(path)] == path:
				return True
		return False
	
	def path_iter(self, path):
		for key in self.keys():
			if key[0:len(path)] == path:
				yield key

	def path_keys(self, path):
		res = []
		for key in self.path_iter(path):
			res.append(key[len(path):])
		return res
	
	def path_iter_arr(self, path):
		count = 0
		while (*path, count) in self:
			yield (*path, count)
			count += 1

	def sort(self, path_order, path_data, mode):
		order_keys = [key for key in self.keys() if key[:len(path_order)] == path_order]
		data_keys = [key for key in self.keys() if key[:len(path_data)] == path_data]
		order_values = [value.split(" ") for value in (self[key] for key in order_keys)]
		order_sorted = natsort.natsorted(order_values, alg=mode)

		def indices_func(i):
			if i < len(order_values):
				return order_values.index(order_sorted[i])
			else:
				return None
				
		def swap_func(curr, next):
			self[data_keys[curr]], self[data_keys[next]] = self[data_keys[next]], self[data_keys[curr]]
			self[order_keys[curr]], self[order_keys[next]] = self[order_keys[next]], self[order_keys[curr]]

		swap_index(indices_func, swap_func)

		return self

class RevisionBatch(list):
	def __init__(self, *args):
		self.extend(args)

def check_update(data):
	if isinstance(data, list):
		data = data[0]
	if isinstance(data, str):
		data = ast.literal_eval(data) # [TODO] Maybe properly handle this in the future
	return data["update"]

def swap_index(index_func, swap_func):
	visited = {}
	i = 0
	while True:
		mapped_index = index_func(i)
		if mapped_index is None:
			break
		if i not in visited:
			current = i
			next_index = mapped_index
			while not visited.get(next_index, False):
				swap_func(current, next_index)
				visited[current] = True
				current = next_index
				next_index = index_func(current)
		i += 1


######################################################################################
######################################## LANG ########################################
######################################################################################

# Special thanks to ChatGPT for this
HIGHWAY_OPS = {'>': 'set', '<': 'get', '!': 'eat'}

def parse_query(input, ops):
	# States
	inside_backticks = False
	operation = None
	name = []
	result = {value: [] for value in ops.values()}  # Initialize result with values from ops
	errors = []
	order = []  # To keep track of the order of operations
	i = 0  # Current index in the input string

	# Helper function to add a command to the result and order
	def add_command(op, name_str):
		if op and name_str:  # Only add if both operation and name are present
			result[op].append(name_str)
			order.append((op, name_str))

	# Iterate over the input string
	while i < len(input):
		char = input[i]

		# Handle operation characters
		if char in ops:
			if inside_backticks:
				name.append(char)
			elif operation is not None:
				errors.append(f"Error at char {i+1}: Multiple operation symbols")
				break
			else:
				operation = ops[char]

		# Handle backticks
		elif char == '`':
			inside_backticks = not inside_backticks
			if not inside_backticks and operation:  # Closing backtick
				if name:
					add_command(operation, ''.join(name))
				name = []
				operation = None

		# Handle valid name characters
		elif char.isalnum() or char in ['-', '_'] or (inside_backticks and char):
			if operation is not None or inside_backticks:
				name.append(char)
			else:
				errors.append(f"Error at char {i+1}: Operation symbol expected before name")
				break

		# Handle spaces
		elif char.isspace():
			if inside_backticks:
				name.append(char)
			elif name:
				add_command(operation, ''.join(name))
				name = []
				operation = None

		# Handle semicolons
		elif char == ';':
			if inside_backticks:
				name.append(char)
			elif name:  # Semicolon outside of backticks ends the current command
				add_command(operation, ''.join(name))
				name = []
				operation = None

		# Handle any other character that is not whitespace (error case)
		elif not char.isspace():
			errors.append(f"Error at char {i+1}: Invalid character '{char}'")
			break

		i += 1  # Move to the next character

	# Check if we're in a valid state after parsing all characters
	if inside_backticks:
		errors.append("Error: Unclosed backticks")

	# If there's an unfinished operation at the end
	if operation and name:
		add_command(operation, ''.join(name))

	# If there's an operation symbol but no name and no other errors
	if operation and not name and not errors:
		errors.append(f"Error at char {i + 1}: Operation '{operation}' without a name")

	# Return the result, any errors, and the order of operations
	return (result, order, errors)

def highway_check(result, errors):
	# Check if duplicate names exist within results
	exists = set()
	for name in result['set']:
		if name in exists:
			errors.append(f"Error: Duplicate input name '{name}'")
		else:
			exists.add(name)

	exists = set()
	for name in result['get'] + result['eat']:
		if name in exists:
			errors.append(f"Error: Duplicate output name '{name}'")
		else:
			exists.add(name)

# def check_used(_way_in, elem):
# 	if elem[1] in _way_in["used"]:
# 		raise Exception(f"Output \"{elem[1]}\" is already used.")

######################################################################################

######################################################################################

# Some secret stuff here for "Alter" node (maybe next update)
