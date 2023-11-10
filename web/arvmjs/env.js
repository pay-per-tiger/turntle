// functions for working with procedure environments

// return the raddr for v in env, false
// if unavailable
search_env = function(env, v) {

	var e;
	e = env;
	while(e && e.length) {
		if(e[0][0] == v)
			return e[0][1];
		else
			e = e[1];
	}
	return false;
};

// trim the environment dictionary envset.
// dictionary entries not found in the
// environment are checked against
// the global symbols. matches are
// removed from envset. returns an
// error object if any entries in envset
// cannot be found in env or syms
trim_env = function(envset, env, syms) {
	var v, found, cursor;

	for(v in envset) {
		//arlog("searching for " + v + " in " + JSON.stringify(env));
		found = 0;
		cursor = env;
		while(cursor && cursor.length) {
			if(cursor[0][0] == v) {
				found = 1;
				break;
			}
			cursor = cursor[1];
		}
		if(!found) {
			if(syms[v]) {
				delete envset[v];
			} else {
				return {
					kind: "error",
					msg: "identifier " + JSON.stringify(v) + " is undeclared",
					exp: envset[v][0]
				}
			}
		}
	}

	return;
};

// fill the dictionary envset with the environment
// of exp.
gobble_env = function(exp, exclude, envset) {

	if(!exp || !exp.kind) {
		arlog("gobble_env: invalid expression");
		return false;
	} else if(exp.kind == "symbol") {
 		// does this work if the environment is shadowing a sym?
		if(envset[exp.val]) {
			return true;
		} else {
			var cursor;
			cursor = exclude;
			while(cursor && cursor.length) {
				if(cursor[0] == exp.val) {
					return true;
				}
				cursor = cursor[1];
			}
			if(envset[exp.val]) {
				envset[exp.val].push(exp);
			} else {
				envset[exp.val] = [ exp ];
			}
			return true;
		}
		return true;
	} else if(exp.kind == "lambda") {
		return gobble_env(exp.body, [exp.var, exclude], envset);
	} else if(exp.kind == "raddr") {
		return true;
	} else if(exp.kind == "number") {
		return true;
	} else if(exp.kind == "string") {
		return true;
	} else if(exp.kind == "nil") {
		return true;
	} else if(exp.kind == "list") {
		if(exp.val.length == 0) {
			return true;
		} else {
			//arlog("AHA GOBBLING _THROUGH_ A LIST: " + JSON.stringify(exp));
			if((exp.val[0].kind == "symbol") && (exp.val[0].val == "lambda")) {
				//arlog("AHA GOBBLING _THROUGH_ A LAMBDA!! SHADOWING " + JSON.stringify(exp.val[1]));
				return gobble_env(exp.val[2], [exp.val[1].val, exclude], envset);
			} else {
				var x;
				for(x = 0 ; x < exp.val.length ; x++) {
					if(!gobble_env(exp.val[x], exclude, envset))
						return false;
				}
				return true;
			}
		}
	} else {
		arlog("gobbling an unknown object: " + exp.kind);
		return false;
	}
	return false;
};

make_envset = function(parameter, body, env, syms) {

	if(!parameter || parameter.kind != "symbol") {
		return {
			kind: "error",
			msg: "parameter must be a symbol",
			exp: parameter
		}
	}

	var envset = {};
	if(!gobble_env(body, syms, envset)) {
		return {
			kind: "error",
			msg: "unable to get environment from body",
			exp: body
		}
	}

	var t;
	t = trim_env(envset, [[parameter.val, parameter], env], syms);
	if(t) {
		return t;
	}

	return { kind: "envset", val: envset };
};
