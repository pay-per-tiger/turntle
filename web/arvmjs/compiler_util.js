mksz = function(g, s) {
	var l;

	if(g.size_hash[s]) {
		return g.size_hash[s];
	} else {
		l = g.labels++;
		g.size_hash[s] = l ;
		g.vml.push(label(l));
		g.vml.push(sz(s));

		return l;
	}
};

mklit = function(g, lt) {
	var l;

	if(g.lit_hash[lt]) {
		return g.lit_hash[lt];
	} else {
		l = g.labels++;
		g.lit_hash[lt] = l ;
		g.vml.push(label(l));
		g.vml.push(lit(lt));

		return l;
	}
};

mknil = function(g) {
	var l;

	if(g.nil_label) {
		return g.nil_label;
	} else {
		l = g.labels++;
		g.nil_label = l;
		g.vml.push(label(l));
		g.vml.push({kind: "nil"});
	}

	return l;
};

mkclit = function(vmstruct, expr) {
	return {kind: "caddr", seg: "labs", val: mklit(vmstruct, expr), type: {typename: "lit"} };
};
mkcnil = function(vmstruct) {
	return {kind: "caddr", seg: "labs", val: mknil(vmstruct), type: {typename: "nil"} };
};

// return size of the vml minus labels and other assembler directives
assembled_size = function(vml) {
	var x, s;
	s = 0;
	for(x = 0 ; x < vml.length ; x++) {
		if(vml[x].kind != "label") s++;
	}
	return s;
};

// pushes the vml as a frame into vmstruct.vml
// returns the label of the addr object
copy_as_frame = function(vmstruct, vml) {
	var body_label, addr_label;
	body_label = vmstruct.labels++;
	addr_label = vmstruct.labels++;
	var body_length = assembled_size(vml);

	vmstruct.vml.push(label(addr_label));
	vmstruct.vml.push(lref(body_label));
	vmstruct.vml.push(label(body_label));
	vmstruct.vml.push(frame(body_length));

	var x;
	for(x = 0 ; x < vml.length ; x++) {
		vmstruct.vml.push(vml[x]);
	}

	return addr_label;
};
