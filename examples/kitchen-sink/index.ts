import type { HTMLString, SinkBindingConfiguration, Stream } from '../../src/index';

import { BehaviorSubject, Observable, Subject, interval, filter, map, merge, mergeWith, of, pipe, scan, startWith, switchMap, take, tap, throwError, withLatestFrom, catchError, ObservedValueOf } from 'rxjs';
import { rml, feedIn, source, sink, AppendHTML, InnerText, InnerHTML, Removed, Sanitize, TextContent, Update, Suspend } from '../../src/index';
import { Value, ValueAsDate, ValueAsNumber, Dataset, EventData, Form, JSONDump, Target, Key, OffsetXY, Numberset, inputPipe, pipeIn } from '../../src/index';
import { char } from '../../src/types/basic';
import { RegisterElement } from '../../src/custom-element';

RegisterElement('custom-element', ({ title, content, onbuttonclick, onput }) => {
	const handle = e => {
		console.log('Internal event', e);
		onput.next(e);
	}

	return rml`
		<div class="cls1">
			<h3>${title}</h3>
			<p>${content}</p>
			Custom Element Works!<br>
			<input type="text" onchange="${Value(handle)}">
			<button type="button" data-foo="bar1" onclick="${Dataset('foo', handle)}">click me</button>
		</div>
	`;
});

// const defer = (...x: any) => new Promise<typeof x>((resolve, reject) => setTimeout(resolve, 5000, ...x));
const defer = <T>(x: T, timeout: number = 500): Promise<T> =>
	new Promise<T>(resolve => setTimeout(resolve, timeout, x));

////////////////////////////////////////////////

const sources = {
	ObjectSourceImplicit: () => {
		const data = {
			prop1: undefined
		}

		const stream = new Subject().pipe(
			map(() => data.prop1) // Just emit the latest value of data.prop1 every time
		);

		return  rml`
			Updating a non-reactive property of an object<br>
			<input onchange="${[data, 'prop1']}"><br>

			<button onclick="${stream}">check</button>
			data.prop1 = <span>${stream}</span>
		`;
	},

	ObjectSourceExplicit: () => {
		const data = {
			prop1: undefined
		};

		const stream = new Subject().pipe(
			map(() => data.prop1) // Just emit the latest value of data.prop1 every time
		);


		return  rml`
			Updating a non-reactive property of an object<br>
			<input onchange="${Update(data, 'prop1')}"><br>

			<button onclick="${stream}">check</button>
			data.prop1 = <span>${stream}</span>
		`;
	},

	ValueSource: () => {
		const stream = new Subject<string>();

		return  rml`
			<input type="text" oninput="${Value(stream)}" placeholder="type someting" autofocus>
			[ <span>${stream}</span> ]
		`;
	},

	ValueAsNumberSource: () => {
		const stream = new Subject<number>().pipe(
			map(x=> isNaN(x) ? '' : 2*x)
		);

		return  rml`
			x : <input type="number" oninput="${ValueAsNumber(stream)}" size="3" autofocus><br>
			2x: <span>${stream}</span>
		`;
	},

	ValueAsDateSource: () => {
		const stream = new Subject<Date | null>().pipe(
			map(d=> {
				d?.setDate(d.getDate() + 1);
				return d?.toDateString() ?? '';
			})
		);

		return  rml`
			Today is: <input type="date" oninput="${ValueAsDate(stream)}" autofocus><br>
			Tomorrow: <span>${stream}</span>
		`;
	},

	FormDataSource: () => {
		const stream = new Subject<string>();

		return  rml`
			<form onsubmit="${Form(stream)}" action="">
				<input name="field1" value="a">
				<input name="field2" value="b">
				<input name="field3" value="c">
				<button>submit</button>
				<input type="submit" value="submit">
			</form>
			Result: <span>${JSONDump(stream)}</span>
		`;
	},


	pipeIn: () => {
		const stream = new Subject<string>();

		const LOG = tap(console.log);
		const VALUE = map((e: Event)=>(<HTMLInputElement>e.target).value);
		const UPPER = map((s: string)=>s.toUpperCase());
		const UNDERLINE = map((s: string)=>s.split('').join('_'));

		return rml`
			Stream: <span>${stream}</span><br>
			<input oninput="${pipeIn<Event, string>(stream, VALUE, UNDERLINE, UPPER, LOG)}">
		`;
	},

	inputPipe: () => {
		const stream = new Subject<string>();

		const LOG = tap(console.log);
		const VALUE = map((e: Event)=>(<HTMLInputElement>e.target).value);
		const UPPER = map((s: string)=>s.toUpperCase());
		const UNDERLINE = map((s: string)=>s.split('').join('_'));

		const UNDERSPLIT = inputPipe<Event, string>(VALUE, UNDERLINE, UPPER, LOG);

		return rml`
			Stream: <span>${stream}</span><br>
			<input oninput="${UNDERSPLIT(stream)}">
		`;
	},


	DatasetSource: () => {
		const stream = new Subject<string>();
		const JustFoo = Dataset('foo');

		return  rml`
			<button data-foo="bar" onclick="${JustFoo(stream)}">click me</button>
			<br>
			data-foo = <span>${stream}</span>
		`;
	},

	Source_Stream_Pipelines: () => {
		const dataset = map((e: Event)=>(<HTMLElement>e.target).dataset)
		const JSONPrint = map(s=>`<pre>${JSON.stringify(s, null, 2)}</pre>`)

		const stream = new Subject<string>();

		return  rml`
			<button data-foo="bar" onclick="${source(dataset, stream)}">click me</button>
			<br>
			data-foo = <span>${sink(stream, JSONPrint)}</span>
		`;
	},

	NumbersetSource: () => {
		const JustTheAmount = Numberset('amount');
		const count = <Subject<number>>new BehaviorSubject(0).pipe(
			scan((a, b)=>a+b)
		);


		return rml`
			<button onclick="${JustTheAmount(count)}" data-amount="-1"> - </button>
			<input type="text" value="${count}" size="3">
			<button onclick="${JustTheAmount(count)}" data-amount="1" > + </button>
		`;
	},

	PointerCoordsSource: () => {
		type coords = [number, number];
		const stream = new Subject<coords>().pipe(
			map(([x, y]) => `x: ${x}; y: ${y}`)
		);

		return rml`
			<div onmousemove="${OffsetXY(stream)}" style="background-color: #ffff80; padding: 3rem; cursor: crosshair;">
				<div>Mouse me over!</div>
				<div>Coords: <span>${stream}</span></div>
			</div>
		`;
	},

	'KeyboardSource (EventData)': () => {
		const stream = new Subject<char>();

		return rml`
			<input oninput="${EventData(stream)}" style="background-color: #ffff80; padding: 3rem;">
			<div>Last key pressed: <strong>${stream}</strong></div>
		`;
	},

	'KeyboardSource (Key)': () => {
		const stream = new Subject<char>();

		return rml`
			<input onkeydown="${Key(stream)}" style="background-color: #ffff80; padding: 3rem;">
			<div>Last key pressed: <strong>${stream}</strong></div>
		`;
	},

	UndefinedSource: () => {
		const empty = undefined;

		return  rml`
			Handler is undefined — nothing should happen.<br>
			<button onclick="${empty}">click me</button>
		`;
	},

}

const sinks = {
	EmptyString: () => {
		return  rml``;
	},

	StaticNumber: () => {
		return  rml`<div>${123}</div>`;
	},

	StaticString: () => {
		return  rml`<div>${'hello'}</div>`;
	},

	AlertButton: () => {
		return  rml`<button onclick="${()=>alert('clicked')}">click me</button>`
	},

	ClassSink: () => {
		const cls1 = 'cls1';
		const cls2 = defer('cls2', 1000);
		const cls3 = defer('cls3', 2000);
		const cls4 = defer('cls4', 3000);

		return  rml`
			<style>
				.cls1 .cls1 {
					text-shadow: 0px 0px 2px goldenrod;
				}
				.cls2 .cls2 {
					color: limegreen;
				}
				.cls3 .cls3 {
					font-weight: bold;
				}
				.cls4 .cls4 {
					font-style: italic;
				}
				.cls5 .cls5 {
					text-decoration: underline;
				}
			</style>
			<div class="cls1">
				should be <span class="cls1">glowing</span>
			</div>
			<div class="${cls2}">
				should go <span class="cls2">green</span>
			</div>
			<div class="cls1 ${cls2} cls3 ${cls4} cls5">
				should turn <span class="cls1">glowing</span>, <span class="cls2">green</span>, <span class="cls3">bold</span>, <span class="cls4">italic</span>, then <span class="cls5">underlined</span>
			</div>
		`;
	},

	CustomElement: () => {
		const notify = (key: string) => void console.log('Notify', key);

		const titleStream = interval(100).pipe(
			map(i => `title ${i}`),
		);

		return rml`
			Should be a custom element
			<custom-element title="${titleStream}" content="hello" data-foo="bar2" oninput="${EventData(notify)}" onclick="${Dataset('foo')(notify)}" />
		`;
	},

	CustomElement2: () => {
		const notify = (key: string) => void console.log('Notify', key);
		const Foo = Dataset('foo');

		const titleStream = interval(100).pipe(
			map(i => `title ${i}`),
		);

		return rml`
			Should be a custom element
			<custom-element title="${titleStream}" content="hello" data-foo="bar2" oninput="${EventData(notify)}" onclick="${Foo(notify)}" />
		`;
	},

	CustomElement3: () => {
		const notify = (key: string) => void console.log('Notify', key);

		const titleStream = interval(100).pipe(
			map(i => `title ${i}`),
		);

		return rml`
			Should be a custom element
			<custom-element title="${titleStream}" content="Hello, injected content" data-foo="bar2" onput="${notify}" onbuttonclick="${notify}" />
		`;
	},

	AddUpPipeInDelegation: () => {
		const n = new BehaviorSubject<number>(0);

		const count = n.pipe(
			scan((acc, input) => acc +input)
		);

		const justButtons = filter((e: Event) => (<HTMLElement>e.target).tagName == 'BUTTON');
		const innerText = map((e: Event) => (<HTMLElement>e.target).innerText);
		const toNumber = map((s: string) => Number(s));

		return rml`
			<div onclick="${source(justButtons, innerText, toNumber, n)}">
				<button>1</button>
				<button>2</button>
				<button>3</button>
				<button>4</button>
				<button>5</button>
				<hr>
				Result: <span>${count}</span>
			</div>
		`;
	},

	StyleValueSync: () => {
		const bg = 'green';

		return  rml`
			<div style="background: clay; color: ${bg}; padding: 1rem;">
				Should be green
			</div>
		`;
	},

	StyleValueAsync: () => {
		const bg = defer('maroon', 500);
		const textDeco = defer('underline', 1000);
		const size = defer('140%', 1500);
		const rest = defer({
			rotate: '20deg',
			opacity: .5,
		}, 2000)

		return  rml`
			<div style="background: #f0c0b0; color: ${bg}; text-decoration: ${textDeco}; padding: 1rem; font-size: ${size}; ${rest}; font-family: monospace;">
				Should turn maroon, underlined, large, rotated, translucent
			</div>
		`;
	},

	UndefinedSink: () => {
		const empty = undefined;

		return  rml`
			<button style="min-width: 5rem; min-height: 2rem;"r>${empty}</button>
		`;
	},

	Mixin1: () => {
		const counter = new BehaviorSubject(0).pipe(
			scan(x=>x+1),
		);

		const mixin1 = (args?: any) => {
			const dataset = {
				foo: 'foo',
				bar: defer('bar'),
			};

			const classObject = {
				class1: defer(true),
				class2: false,
			};

			const style = {
				color: 'red',
				font: defer('24px monospace', 1000),
			};

			const events = {
				onmouseover: () => console.log('mouseover'),
				onmouseout: () => console.log('mouseout'),
			};

			return {
				dataset,
				'data-deferred': defer('deferred'),
				class: classObject,
				style,
				...events,
			};
		};

		return rml`
			<style>
				.mx::before {
					content: attr(data-hello);
				}
				.mx::after {
					content: attr(data-foo);
				}
			</style>
			<div class="mx" ...${mixin1()}>
				with mixin1()
				<button type="button" onclick="${counter}"> Click me </button><br>
				You clicked the button <span>${counter}</span> times.
			</div>
		`
	},

	Mixin2Promise: () => {
		const counter = new BehaviorSubject(0).pipe(
			scan(x=>x+1),
		);

		const mixin1 = async (args?: any) => {
			const dataset = {
				hello: 'world',
				// test: () => 123, // TS error ;)
				foo: defer('bar'),
			};

			const classObject = {
				class1: true,
				class2: false,
				class3: defer(true),
			};

			const style = {
				color: 'red',
				font: defer('24px monospace'),
			};

			const events = {
				onmouseover: () => console.log('mouseover'),
				onmouseout: () => console.log('mouseout'),
			};

			await defer(1000);

			return {
				dataset,
				'data-deferred': defer('deferred'),
				class: classObject,
				style,
				...events,
			};
		};

		return rml`
			<div ...${mixin1()}>
				with mixin1()
				<button type="button" onclick="${counter}"> Click me </button><br>
				You clicked the button <span>${counter}</span> times.
			</div>
		`;
	},

	Mixin3: () => {
		const mixin2 = (args?: any) => {
			const dataset = new Subject();
			const classObject = new Subject();
			const style = new Subject();
			const events = new Subject();
			const innerHTML = new Subject();

			setTimeout(() => {
				dataset.next({
					hello: 'world',
					foo: 'bar',
				});

				classObject.next({
					class1: true,
					class2: false,
				});

				style.next({
					color: 'red',
					font: '20px monospace',
				});

				events.next({
					onclick: () => alert('mouseover'),
					onmouseout: () => console.log('mouseout'),
				});

				innerHTML.next('Replaced!');
			}, 2000)

			return {
				dataset,
				class: classObject,
				style,
				events,
				innerHTML,
			};
		};

		return rml`
			<div ...${mixin2()}>
				with mixin2()
			</div>
		`;
	},

	'Removed (Implicit)': () => {
		const removed = new Subject<Event>();

		return  rml`
			<div rml:removed="${removed}">
				Removed (Implicit) sink
				<button onclick="${removed}">Remove</button>
			</div>
		`
	},

	'Removed (Implicit Mixin)': () => {
		const removed = new Subject().pipe(
			map(() => ({
				'rml:removed': true,
				'class': 'removed',
			})),
		);

		return rml`
			<div ...${removed}>
				Removed (Implicit Mixin) sink
				<button onclick="${removed}">Remove</button>
			</div>
		`;
	},


	'Removed (Implicit Mixin, async)': () => {
		const removed = new Subject().pipe(
			map(() => ({
				'rml:removed': defer(true),
				'class': 'removed',
			})),
		);

		return rml`
			<div ...${removed}>
				Removed (Implicit Mixin) sink
				<button onclick="${removed}">Remove</button>
			</div>
		`;
	},

	'Removed (Explicit Mixin)': () => {
		const removed = new Subject<boolean>();

		return rml`
			<div ...${Removed(removed)}>
				Removed (Implicit Mixin) sink<br>
				(this should NOT be supported, in theory)<br>
				<button onclick="${removed}">Remove</button>
			</div>
		`;
	},


	'Attribute (Implicit)': () => {
		const stream = defer('bar');

		return rml`
			Attribute sink <br>
			<style>
				.pqpqpq::after {
					content: attr(foo);
					margin: 0 1rem;
					color: green;
				}
			</style>
			<span class="pqpqpq" foo="${stream}">foo...</span>
		`;
	},

	'Attribute (Mixin)': () => {
		const stream = defer({foo: 'bar'});

		return rml`
			Attribute sink <br>
			<style>
				.pqpqpq::after {
					content: attr(foo);
					margin: 0 1rem;
					color: green;
				}
			</style>
			<span class="pqpqpq" ...${stream}>foo...</span>
		`;
	},

	SyncDisabled__: () => {
		const disabled = false;
		const clicked$ = new Subject().pipe(
			tap(x=>console.log('in', x)),
			map(() => 'clicked!'),
			tap(x=>console.log('out', x)),
		);

		return rml`
			<button disabled="${disabled}" onclick="${clicked$}">disabled=false</button>
			<br><br>
			<div>Clicked? [<span>${clicked$}</span>]</div>
		`;
	},

	AsyncDisabled: () => {
		const toggle = interval(1000).pipe(
			scan(x=>!x, false)
		);

		return rml`
			Async disabled sink
			<button disabled="${toggle}">disabled stream</button>
		`;
	},

	AsyncReadonly: (t = 2000) => {
		const toggle = interval(1000).pipe(
			scan(x=>!x, false)
		);

		return rml`
			Async readonly sink
			<input readonly="${toggle}" value="toggle readonly, not only">
		`
	},

	AsyncDialogToggle: (t = 1000) => {
		const open$ = new Subject().pipe(
			scan(x=>!x)
		);

		return rml`
			Async dialog toggle sink
			<dialog open="${open$}">
				<p>dialog content</p>
			</dialog>
			<button onclick="${open$}">toggle</button>
		`;
	},

	AsyncDialogOpen: (t = 1000) => {
		const open$ = new Subject().pipe(
			map(_=>true)
		);
		const close$ = new Subject().pipe(
			map(_=>false)
		);
		const remove = new Subject();
		const toggle = merge(open$, close$);

		return rml`
			Async dialog open sink
			close and destroy (can't reopen)
			<dialog open="${toggle}" rml:removed="${remove}">
				<p>dialog content</p>
				<button onclick="${close$}">close</button>
				<button onclick="${remove}">remove</button>
			</dialog>
			<button onclick="${open$}">open</button>
			<button onclick="${close$}">close</button>
			<button onclick="${remove}">remove</button>
		`;
	},

	'AppendHTML (Explicit)': () => {
		const counter = interval(500).pipe(
			map(i=> `INTERVAL => ${i}<br>` as HTMLString)
		);

		return rml`
			Explicit AppendHTML sink
			<div>${AppendHTML(counter)}</div>
		`;
	},

	'InnerHTML (Implicit)': () => {
		const counter = interval(500).pipe(
			map(i=> `INTERVAL => ${i}`)
		);

		return rml`
			Simple content sink
			<div>${
				counter
			}</div>
		`;
	},

	'InnerHTML (Explicit)': () => {
		const counter = interval(500).pipe(
			map(i=> <HTMLString>`INTERVAL => ${i}`)
		);

		return rml`
			Explicit InnerHTML sink
			<div>${InnerHTML(counter)}</div>
		`;
	},

	ExplicitInnerText: () => {
		const counter = interval(500).pipe(
			map(i=> <HTMLString>`<strong>INTERVAL</strong> => ${i}`)
		);

		return rml`
			Explicit InnerText sink
			<div>${InnerText(counter)}</div>
		`;
	},

	RMLOnMount: () => {
		const onmount = () => alert('mounted');

		return rml`
			<div rml:onmount="${onmount}">do on mount</div>
		`;
	},

	OnPlay: () => {
		const onmount = () => alert('play');

		return rml`
			<video controls onplay="${onmount}" style="max-width: 50%;">
				<source src="./flower.webm" type="video/webm" />
			</video>
		`;
	},

	TextContentExplicit: () => {
		const stream = interval(500);

		return rml`
			<div>
				${TextContent(stream)}
			</div>
		`;
	},

	TextNodes: () => {
		const stream = interval(500);
		const stream2 = new BehaviorSubject(0).pipe(
			scan(x=>x+1)
		);

		return rml`
			<div>
				Timer: ${stream}
				Count: ${stream2}
			</div>
			<button onclick="${stream2}">click</button>
		`;
	},

	OtherTextNodes: () => {
		const stream = interval(500);
		const stream2 = new BehaviorSubject(0).pipe(
			scan(x=>x+1)
		);

		return rml`
			<button onclick="${stream2}">click</button>
			<div style="white-space: pre-line">
				Hello

				Timer: ${stream}
				Count: ${stream2}${stream2} ${stream2} :-: ${stream2}

				Bye
			</div>
		`;
	},


	Array: () => {
		const children = [
		'foo', 'bar', 'baz', 'bat', 'bam'
		];

		return rml`
			<ol>
			${
				children.map(str =>
					rml`<li>${str}</li>`
				)
			}
			</ol>
		`;
	},

	StreamsArray: () => {
		const children = [...Array(5)]
			.map((_, i)=>interval((i+1)*100))
		;

		return rml`
			<ol>
			${
				children.map(str =>
					rml`<li>${str}</li>`
				)
			}
			</ol>
		`;
	},

//	Sanitize: () => {
//		const Sanitize = (input: Observable<string>) => ({
//			type: 'sink',
//			source: input.pipe(
//				map(strHTML => strHTML.replace(/</g, '&lt;'))
//			),
//			sink: InnerHTMLSink
//		});
//
//		const stream = of('<script>alert("evil")</script>');
//
//		return rml`
//			<div>${Sanitize(stream)}</div>
//		`;
//	},

	Sanitize: () => {
		const stream = of(<HTMLString>`<div>
			Dirty code
			<script>alert("evil")</script>
			<img onload="alert('hack')" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZmlsbD0icmVkIiBkPSJNNTAgMTAwYTUwIDUwIDAgMSAwIDAtMTAwIDUwIDUwIDAgMCAwIDAgMTAwWiIvPjwvc3ZnPg==" width="100" height="100" />
			</div>
		`);

		return rml`
			<div>${Sanitize(stream)}</div>
		`;
	},

	CustomSink: () => {
		const Animate: SinkBindingConfiguration<HTMLElement> = (input: Observable<any>) => ({
			type: 'sink',
			source: input,
			sink: (node: HTMLElement) => {
				node.style.display = 'inline-block';
				return (data: any) => {
					node.style.transformOrigin = 'center center';
					node.animate([
						{ transform: "rotate(0turn) scale(1)" },
						{ transform: "rotate(1turn) scale(0)" },
					],{
						duration: 1000,
						iterations: 1,
					});
				};
			}
		});

		const stream = new Subject<any>();

		return rml`
			<div>
				Blah
				<div ...${Animate(stream)}>Animated bit</div>
			</div>

			<button onclick="${stream}">animate</button>
		`;
	},

	ErrorHandling: () => {
		// Error Catcher Sink
		const Catch = (stream: Observable<any>, handler: (e: Error) => HTMLString | string) => 
			stream.pipe(
				catchError((err: Error) => of(handler(err)))
			)
		;

		// Countdown Source Mapper
		const CountDown = (stream: Observable<any>, limit: number) =>
			pipeIn(stream,
				scan((a, _b) => a-1, limit),
			);

		// "Suspense" Sink
		const Suspend = (stream: Observable<any>, initial: any) =>
			new BehaviorSubject(initial).pipe(
				mergeWith(stream)
			);

		// Main State stream
		const stream = new Subject().pipe(
			map(count => {
				if (count == 0) {
					throw new Error('Synthetic Error');
				}
				return count
			}),
		);

		return rml`
			<button onclick="${CountDown(stream, 5)}">Next</button><br>
			Output:<br>
			<div>${Catch(Suspend(stream, 5), e => `Caught: ${e.message}`)}</div>
		`;
	},

	Completion: () => {
		const stream = new Subject().pipe(
			startWith('only value'),
			take(1),
		);

		return rml`
			Closing stream
			<div>${stream}</div>
		`;
	},
}

const component = () => {

	const chosen = new Subject<[object, string]>();

	const chosenSource = chosen.pipe(
		map(([testCollection, x])=>testCollection[x]),
	);

	const chosenComponent = chosenSource.pipe(
		map(src=>src()),
	);

	const logger = new Subject();
	logger.subscribe(x=>{
		console.log('>>>>>', x)
	})

	const Tooltip = (str) => String(str)
		.replace(/"/g, "''")

	return rml`
		<style>
			* {
				font-size: 16px;
			}

			body {
				font-size: 8px;
			}

			code {
				display: block;
				background-color: #e0e0e0;
				padding: 1rem;
				white-space: pre;
				tab-size: 2;
			}

			.rendered {
				background-color: #e0e0f0;
				padding: 1rem;
			}

			@media(prefers-color-scheme: dark) {
				body, code {
					background: #333;
					color: #aaa;
				}

				button {
					background: #ccc;
					color: #222;
				}
			}

			.twocol {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 1rem;
			}

			.selector {
				display: flex;
				width: 100%;
				overflow-x: auto;
			}

			.output {
				margin: 0;
				padding: 0;
				background-color: white;
				border: 2px solid;
			}

			fieldset {
			}

			li {
				margin-block: .2rem;
			}

			.class1::before {
				display: inline-block;
				content: attr(data-deferred);
				padding: 2px 6px;
				color: white;
				background-color: black;
			}

			.class3 {
				font-weight: bold;
			}

			input:read-only {
				color: #999;
			}

			a.btn {
				display: inline-block;
				padding: .2rem .4rem;
				background-color: #eee;
				color: #222;
				border-radius: 2px;
				border: 1px solid #777;
				font-family: system-ui;
				font-size: 80%;
				text-decoration: none;
			}

			a.btn:target,
			button:active,
			button:focus {
				display: inline-block;
				background-color: #333;
				color: #ccc;
			}

			@media(prefers-color-scheme: dark) {
				a.btn {
					background-color: #222;
					color: #eee;
				}

				button:active,
				button:focus {
					background-color: #888;
					color: #111;
				}
			}

		</style>

		<div class="output">
			<div class="selector">
				<fieldset>
					<legend>Sources</legend>
					<ul style="list-style-type: none;">
					${
						Object.keys(sources).map((t, i, tests)=>rml`
							<li><a class="btn" id="${t}" href="#${t}" title="${Tooltip(tests[t])}" onclick="${pipeIn(chosen, map(()=>[sources, t] as [object, string]))}">${t}</a></li>
						`).join('')
					}
					</ul>
				</fieldset>

				<fieldset>
					<legend>Sinks</legend>
					<ul style="max-height: 50vh; overflow: visible; column-count: 3; list-style-type: none;">
					${
						Object.keys(sinks).map((t, i, tests)=>rml`
							<li><a class="btn" id="${t}" href="#${t}" title="${Tooltip(tests[t])}" onclick="${pipeIn(chosen, map(()=>[sinks, t] as [object, string]))}">${t}</a></li>
						`).join('')
					}
					</ul>
				</fieldset>
			</div>
			<hr>
			<div class="twocol">
				<div>
					Rendered:
					<div class="rendered" style="margin-block: 2rem;">
						${chosenComponent}
					</div>
				</div>
				<div>
					Code:
					<code>${InnerText(chosenSource)}</code>
				</div>
			</div>
		</div>

	`;
}

document.body.innerHTML = component();
