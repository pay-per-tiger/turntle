
// return a list of sexps found in string <form> starting from index <idx>
read_sexp = function(form, idx) {
	var state;
	var acc;
	var depth = 0;
	var stack = [{kind: "list", val: [], start_idx: idx}];
	var start_idx = idx;

	var delim_thresh = 16; // states below here are delimited by whitespace
	state = 0;
	var STATE_SYM = 1;
	var STATE_DEC_INT = 2;
	var STATE_DEC_FLOAT = 3;
	var STATE_S_STRING = delim_thresh + 1;
	var STATE_D_STRING = delim_thresh + 2;
	acc = '';

	while(idx < form.length) {
		if((state < delim_thresh) && (form[idx] == '(' || form[idx] == '[')) {
			if(state > 0) {
				if(state == STATE_SYM) {
					stack[0].val.push({
						kind: "symbol",
						start_idx: start_idx,
						end_idx: idx,
						val: acc
					});
				} else if(state == STATE_DEC_INT) {
					stack[0].val.push({
						kind: "number",
						start_idx: start_idx,
						end_idx: idx,
						val: parseInt(acc)
					});
				} else if(state == STATE_DEC_FLOAT) {
					stack[0].val.push({
						kind: "number",
						start_idx: start_idx,
						end_idx: idx,
						val: parseFloat(acc)
					});
				} else {
					stack[0].val.push(acc);
				}
				acc = '';
				state = 0;
				start_idx = idx;
			}
			stack = [ {kind: "list", start_idx: idx, val: []}, stack ];
			depth++;
			idx++;
		} else if((state < delim_thresh) && (form[idx] == ')' || form[idx] == ']')) {
			if(depth == 0) {
				// extra close
				return {
					kind: "error",
					msg: "unmatched close parenthesis",
					//start_idx: start_idx,
					start_idx: idx,
					idx: idx
				};
			} else {
				
				depth--;
				if(state > 0) {
					if(state == STATE_DEC_INT) {
						stack[0].val.push({
							kind: "number",
							start_idx: start_idx,
							end_idx: idx,
							val: parseInt(acc)
						});
					} else if(state == STATE_DEC_FLOAT) {
						stack[0].val.push({
							kind: "number",
							start_idx: start_idx,
							end_idx: idx,
							val: parseFloat(acc)
						});
					} else if(state == STATE_SYM) {
						stack[0].val.push({
							kind: "symbol",
							start_idx: start_idx,
							end_idx: idx,
							val: acc
						});
					} else {
						stack[0].val.push(acc);
					}
					acc='';
					state = 0;
				}
				stack[0].end_idx = idx + 1;
				stack[1][0].val.push(stack[0]);
				stack = stack[1];
			}
			idx++;
		} else if((state < delim_thresh) && ( (form[idx] == ' ') || (form[idx] == '\t') )) {
			if(state > 0) {
				if(state == STATE_SYM) {
					stack[0].val.push({
						kind: "symbol",
						start_idx: start_idx,
						end_idx: idx,
						val: acc
					});
				} else if(state == STATE_DEC_INT) {
					stack[0].val.push({
						kind: "number",
						start_idx: start_idx,
						end_idx: idx,
						val: parseInt(acc)
					});
				} else if(state == STATE_DEC_FLOAT) {
					stack[0].val.push({
						kind: "number",
						start_idx: start_idx,
						end_idx: idx,
						val: parseFloat(acc)
					});
				} else {
					stack[0].val.push(acc);
				}
				acc='';
				state = 0;
			}
			idx++;
		} else if(state == STATE_S_STRING) {
			if(form[idx] == "'") {
				stack[0].val.push({
					kind: "string",
					start_idx: start_idx,
					end_idx: idx,
					val: acc
				});
				acc = '';
				state = 0;
			} else {
				acc+=form[idx];
			}
			idx++;
		} else if(state == STATE_D_STRING) {
			if(form[idx] == "\"") {
				stack[0].val.push({
					kind: "string",
					start_idx: start_idx,
					end_idx: idx,
					val: acc
				});
				acc = '';
				state = 0;
			} else {
				acc+=form[idx];
			}
			idx++;
		} else {
			if(state > 0) {
				if(state == STATE_DEC_INT) {
					if(form[idx].match(/[0-9-]/)) {
						acc += form[idx];
					} else if(form[idx].match(/[.]/)) {
						state = STATE_DEC_FLOAT;
						acc += form[idx];
					} else {
						return {
							kind: "error",
							msg: "invalid decimal integer",
							start_idx: start_idx,
							idx: idx
						};
					}
				} else if(state == STATE_DEC_FLOAT) {
					if(form[idx].match(/[0-9-]/)) {
						acc += form[idx];
					} else {
						return {
							kind: "error",
							msg: "invalid decimal rational",
							start_idx: start_idx,
							idx: idx
						};
					}
				} else {
					acc += form[idx];
				}
			} else {
				if(form[idx].match(/[0-9-]/)) {
					acc = form[idx];
					state = STATE_DEC_INT;
					start_idx = idx;
				} else if(form[idx].match(/[.]/)) {
					acc = form[idx];
					state = STATE_DEC_FLOAT;
					start_idx = idx;
				} else if(form[idx].match(/'/)) {
					acc = "";
					state = STATE_S_STRING;
					start_idx = idx;
				} else if(form[idx].match(/"/)) {
					acc = "";
					state = STATE_D_STRING;
					start_idx = idx;
				} else {
					acc = form[idx];
					state = STATE_SYM;
					start_idx = idx;
				}
			}
			idx++;
		}
	}

	if(acc) {
		if(state == STATE_SYM) {
			stack[0].val.push({
				kind: "symbol",
				start_idx: start_idx,
				end_idx: idx,
				val: acc
			});
		} else if(state == STATE_DEC_INT) {
			stack[0].val.push({
				kind: "number",
				start_idx: start_idx,
				end_idx: idx,
				val: parseInt(acc)});
		} else if(state == STATE_DEC_FLOAT) {
			stack[0].val.push({
				kind: "number",
				start_idx: start_idx,
				end_idx: idx,
				val: parseFloat(acc)});
		} else if(state == STATE_D_STRING) {
			return {
				kind: "error",
				msg: "unterminated string",
				start_idx: start_idx,
				restartable: true,
				idx: idx
			};
		} else if(state == STATE_S_STRING) {
			return {
				kind: "error",
				msg: "unterminated string",
				start_idx: start_idx,
				restartable: true,
				idx: idx
			};
		} else {
			stack[0].val.push(acc);
		}
		acc='';
	}

	if(depth != 0) {
		return {
			kind: "error",
			msg: "missing close parenthesis",
			start_idx: start_idx,
			restartable: true,
			idx: idx
		};
	}

	return stack[0].val;
};

symeq = function(val, name) {
	if(!val || (val.kind != "symbol")) {
		error("symeq: requires a symbol");
		return false;
	}
	if(typeof(name) != "string") {
		error("symeq: requires a string name");
		return false;
	}

	if(val.val == name) {
		return true;
	} else {
		return false;
	}
}
