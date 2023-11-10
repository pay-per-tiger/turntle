
mktoplevel = function() {
	return [];
};

wrap_toplevel = function(tl, exp) {
	var t;
	var x;

	for(x = 1 ; x <= tl.length ; x++) {
		exp = {kind: "list", val: [
			{kind: "list", val: [
				{kind: "symbol", val: "lambda"},
				{kind: "symbol", val: tl[tl.length - x][0]},
				exp
			]},
			tl[tl.length - x][1]
		]};
	}
	/*
	for(t in tl) {
		exp = {kind: "list", val: [
			{kind: "list", val: [
				{kind: "symbol", val: "lambda"},
				{kind: "symbol", val: tl[t][0]},
				exp
			]},
			tl[t][1]
		]};
	}
	*/

	return exp;
};

// take a toplevel and an expression. perform
// any toplevel actions and return a form for compilation.
process_toplevel = function(tl, exp, syms) {
	if(!exp || !exp.kind) {
		arlog('wrong exp');
		return false;
	}

	if((exp.kind == "list") && (exp.val.length > 2)) {
		//arlog('checking for top-level define');
		if((exp.val[0].kind == "symbol") && symeq(exp.val[0], "define")) {
			//arlog('got a top-level define');
			if(exp.val[1].kind != "symbol") {
				arlog("define takes a symbol");
				return false;
			}

			var v;
			v = macro_expand(exp.val[2], syms);
			if(!v || (v.kind == "error")) {
				return v;
			}

			var rewrite = function(e) {
				//arlog('rewriting: ' + pp(e));
				if((e.kind == "symbol") && (e.val == exp.val[1].val)) {
					return {kind: "list", val: [ e, e ]};
				} else if(e.kind != "list") {
					return e;
				} else if(e.val.length == 0) {
					return e;
				} else if((e.val[0].kind == "symbol") && (e.val[0].val == "lambda") && (e.val[1].kind == "symbol") && (e.val[1].val == exp.val[1].val)) {
					// lambda that aliases us
					return e; 
				} else {
					var acc = [];
					var x;
					for(x = 0 ; x < e.val.length ; x++) {
						acc.push(rewrite(e.val[x]));
					}
					return {kind:"list", val: acc};
				}
			}

			// there is no need to do this rewriting
			// unless the body references the name.

			v = rewrite(v);
			v = {kind:"list", val: [
				{kind: "list", val: [
					{kind: "symbol", val: "lambda"},
					{kind: "symbol", val: "v"},
					{kind: "list", val: [
						{kind: "symbol", val: "v"},
						{kind: "symbol", val: "v"}
					]}
				]},
				{kind: "list", val: [
					{kind: "symbol", val: "lambda"},					
					exp.val[1],
					v
				]}
			]}

			tl.push([exp.val[1].val, v]);

			return {kind: "list", val: []};
		} else {
			return wrap_toplevel(tl, exp);
		}
	} else {
		return wrap_toplevel(tl, exp);
	}
};

