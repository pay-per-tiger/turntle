'use strict';
var logo_stdlib = "[\
	to [ play m ] [\
		if [ islist m ] \
			[ \
				let l length m \
				let c 0 \
				set c 0 \
				do l [\
					force _play ref m c \
						incr c \
				]\
				0\
			] \
			[ _play m ] \
	]\
	to [ngon_ n s a] [ \
		fd div s 2 \
		rt a \
		do add n -1 [ \
			fd s \
			rt a \
		] \
		fd div s 2\
	]\
	to [ngone r n] [ \
		ngon_ \
			n \
			mul \
				2 \
				mul \
					r \
					tan div \
						div 360 n \
						2 \
			div 360 n \
	]\
	to [ngone_l r n] [ \
		ngon_ \
			n \
			mul \
				2 \
				mul \
					r \
					tan div \
						div 360 n \
						2 \
			div -360 n \
	]\
	to [ngon r n] [ \
		pu \
		fd r \
		rt 90 \
		pd \
		ngone r n \
		pu \
		lt 90 \
		bk r \
		pd \
	]\
	to [ngon_l r n] [\
		pu \
		fd r \
		lt 90 \
		pd \
		ngone_l r n \
		pu \
		rt 90 \
		bk r \
		pd \
	]\
	to [square r] [\
		ngon r 4\
	]\
	to [square_l r] [\
		ngon_l r 4\
	]\
	to [circle r] [\
		ngon r 40\
	]\
	to [circle_l r] [\
		ngon_l r 40\
	]\
	to [ngonf r n ] [\
		if less r div pw 2 [ \
			if less mul r 2 pw [ \
				err 'diameter less than pen width' \
			] [ 0 ] \
		] [ \
			let lim sub r div pw 2 \
			let cnt quot lim pw \
			let x 1 \
			do cnt [ \
				fd pw \
				rt 90 \
				ngone mul x pw n \
				lt 90 \
				incr x \
			] \
			fd sub lim mul cnt pw \
			rt 90 \
			ngone lim n \
			lt 90 \
			bk lim \
		] \
	]\
\
set fontx 0 \
set fonty 0 \
set fontscale 1 \
to [ dopoint x y ] [\
	let dy sub y fonty \
	let dx sub x fontx \
	let bar sqrt add mul dx dx mul dy dy \
\
	let foo 0\
	if [ equal dx 0 ]\
		if [ less dy 0 ]\
			[ set foo -90 ]\
			[ set foo 90 ]\
		[set foo atan div dy dx]\
\
	if [ less dx 0 ] \
		[ lt add 180 foo ]\
		[ lt foo ]\
\
	fd mul fontscale bar \
\
	if [ less dx 0 ] \
		[ rt add 180 foo ]\
		[ rt foo ]\
\
	set fontx x \
	set fonty y \
]\
\
\
to [ drawletter letter ] [\
	let m [ metrics letter ]\
\
	set fontx 0 \
	set fonty 0 \
\
	let f 0 \
	let p ref m 1 \
	let l sub length p 1 \
	pu \
	dopoint ref ref p 0 0 \
		ref ref p 0 1 \
	pd \
	let x 1 \
	do sub l 1 [\
		set f ref p x \
\
		if [ and [ equal ref f 0 -1] \
			 [ equal ref f 1 -1] \
			]\
			[ pu ]\
			[\
				[ dopoint ref f 0 ref f 1 pd ]\
			]\
		set x add x 1 \
	]\
	pu \
	dopoint ref m 0 0 \
]\
\
to [ write str ] [\
	let x 0\
	do strlength str [\
		drawletter strref str x \
		set x add x 1 \
	]\
]\
\
to [ wr str ] [\
	write str \
]\
\
to [ strwidth str ] [\
	let x 0 \
	let c 0 \
	do strlength str [\
		set c add ref [ metrics strref str x ] 0 c \
		set x add x 1 \
	]\
	c \
]\
to [ drawstringc str a ] [\
	let x 0 \
	do strlength str [\
		drawletter strref str x \
		rt a \
		set x add x 1 \
	]\
]\
\
to [ map func lst ] [\
	let x 0 \
	let l length lst \
	let n mklist l \
	do l [ \
		setref n x func ref lst x \
		set x add x 1 \
	] \
	n \
]\
\
to [ segangle seg ] [\
	let dx [ sub ref seg 3 ref seg 0 ] \
	let dy [ sub ref seg 4 ref seg 1 ] \
	let dz [ sub ref seg 5 ref seg 2 ] \
	if [ less dx 0 ] \
		if [ equal dy 0 ] \
			180 \
			add 180 [ atan div dy dx ] \
		if [ equal dy 0 ] \
			0 \
			[ atan div dy dx ] \
]\
\
to [ segspan seg ] [\
	let dx [ sub ref seg 3 ref seg 0 ] \
	let dy [ sub ref seg 4 ref seg 1 ] \
	let dz [ sub ref seg 5 ref seg 2 ] \
	sqrt add mul dy dy mul dx dx \
]\
\
to [ draw l ] [\
	let ll length l \
	let x 0 \
	let cx 0 \
	let cy 0 \
	let cz 0 \
	let ca 0 \
	do ll [ \
		let seg ref l x \
		if and and equal ref seg 0 cx equal ref seg 1 cy ref seg 2 cz \
			[ display 'continues' ] \
			[ display 'discontinues' ] \
		set cx ref seg 3 \
		set cy ref seg 4 \
		set cz ref seg 5 \
		set x add x 1 \
	] \
]\
to [ outline l w ] [\
	let c 0 \
	let ca 0 \
	let cx 0 \
	let cy 0 \
	let cz 0 \
	let x length l \
	x \
	do x [ \
		let seg ref lines c \
		let sa segangle seg \
		let ss segspan seg \
		set sa sub sa ca \
		lt add sa 90 \
		fd div w 2 \
		rt 90 \
		fd ss \
		rt 90 \
		fd w \
		rt 90 \
		fd ss \
		rt 90 \
		fd div w 2 \
		rt 90 \
		pu \
		fd ss \
		pd \
		set cx ref seg 3 \
		set cy ref seg 4 \
		set cz ref seg 5 \
		set c add c 1 \
		set ca add ca sa \
	] \
]\
\
]";
/*
*/
