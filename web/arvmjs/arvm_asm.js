// no true assembler here. primitives
// that return arvm objects.

alice = function() {
	return {kind: "op", val: "alice"};
};

sz = function(v) {
	return {kind: "sz", val: v};
};

lit = function(v) {
	return {kind: "lit", val: v};
};

addr = function(v) {
	return {kind: "addr", val: v};
};

ar_debug = function(v) {
	return {kind: "debug", msg: v};
};

blank = function() {
	return {kind: "blank"};
};

feed = function(arg1_seg, arg1, arg2_seg, arg2) {
	return {kind: "op", val: "feed", "arg1_seg": arg1_seg, "arg1": arg1, "arg2_seg": arg2_seg, "arg2": arg2};
};

fork = function(arg1_seg, arg1, arg2_seg, arg2) {
	return {kind: "op", val: "fork", "arg1_seg": arg1_seg, "arg1": arg1, "arg2_seg": arg2_seg, "arg2": arg2};
};

set = function(arg1_seg, arg1, arg2_seg, arg2) {
	return {kind: "op", val: "set", "arg1_seg": arg1_seg, "arg1": arg1, "arg2_seg": arg2_seg, "arg2": arg2};
};

call = function(target, arg1_seg, arg1) {
	return {kind: "op", val: "call", "target": target, "arg1_seg": arg1_seg, "arg1": arg1 };
};

frame = function(size) {
	return {kind: "frame", "size": size};
};

// label (these are rewritten by the assembler

label = function(l) {
	return {kind: "label", "val": l};
};

lref = function(l) {
	return {kind: "lref", "val": l};
};

err = function(msg) {
	return {kind: "err", "val": msg};
};
