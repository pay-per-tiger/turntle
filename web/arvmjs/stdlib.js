
stdlib = [
	"(define cons (lambda (a b) (_cons 'cons' a b)))",
	"(define foreach (lambda (proc l)\
		((lambda helper\
			(helper helper l)\
		) (lambda (helper l)\
			(if (isnil l)\
				()\
				(if (iscons l)\
					(sync\
						(proc (car l))\
						(helper helper (cdr l))\
					)\
					'bad cons'\
				)\
			)\
		))\
	))",
	"(define map (lambda (proc l)\
		((lambda helper\
			(helper helper l)\
		) (lambda (helper l)\
			(if (isnil l)\
				()\
				(if (iscons l)\
					(cons\
						(proc (car l))\
						(helper helper (cdr l))\
					)\
					'bad cons'\
				)\
			)\
		))\
	))",
	"(define repeat_ (lambda (proc count)\
		((lambda helper \
			(helper helper count) \
		) (lambda (helper count) \
			(if (gt count 0) \
				(begin \
					(proc) \
					(helper helper (sub count 1)) \
				) \
			)\
		))\
	))",
];
