
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind$1(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Header.svelte generated by Svelte v3.46.4 */

    const file$7 = "src\\components\\Header.svelte";

    function create_fragment$7(ctx) {
    	let header;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			header = element("header");
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = /*imageSrc*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Logo");
    			attr_dev(img, "class", "svelte-1mmlrgr");
    			add_location(img, file$7, 5, 4, 62);
    			attr_dev(header, "class", "svelte-1mmlrgr");
    			add_location(header, file$7, 4, 0, 48);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, img);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imageSrc*/ 1 && !src_url_equal(img.src, img_src_value = /*imageSrc*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	let { imageSrc } = $$props;
    	const writable_props = ['imageSrc'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('imageSrc' in $$props) $$invalidate(0, imageSrc = $$props.imageSrc);
    	};

    	$$self.$capture_state = () => ({ imageSrc });

    	$$self.$inject_state = $$props => {
    		if ('imageSrc' in $$props) $$invalidate(0, imageSrc = $$props.imageSrc);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imageSrc];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { imageSrc: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*imageSrc*/ ctx[0] === undefined && !('imageSrc' in props)) {
    			console.warn("<Header> was created without expected prop 'imageSrc'");
    		}
    	}

    	get imageSrc() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageSrc(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const EditorStore = writable(null);

    function InitFireBase() {
        // Initialize the Firebase SDK.
        firebase.initializeApp({
          apiKey: "AIzaSyCAmLg97LMRIKsZrYStaVbUjMFSvA2pLm4",
          databaseURL: "https://wecode-1aff7-default-rtdb.firebaseio.com/",
        });
      
        // Get Firebase Database reference.
        var firepadRef = firebase.database().ref();
      
        const urlparams = new URLSearchParams(window.location.search);
        const roomId = urlparams.get("id");
      
        if (roomId) {
          firepadRef = firepadRef.child(roomId);
        } else {
          firepadRef = firepadRef.push();
          window.history.replaceState(null, "Share Code", "?id=" + firepadRef.key);
        }
      
        return firepadRef;
      }

    const InitEditor = (id) => {
       let editor =  CodeMirror(document.getElementById(id), {
            lineNumbers: true,
            theme: "dracula",
            mode: "javascript",
        });
       editor.setSize("100%", "100%");

       let dbRef = InitFireBase();
       Firepad.fromCodeMirror(dbRef, editor, {
        defaultText: "// Write your code here ",
      });

       EditorStore.set(editor);
    };

    const downloadCodeFromEditor =(filename)=>{
        let anchor = document.createElement("a");
        anchor.style.display="none";

        let editor = get_store_value(EditorStore);

        anchor.setAttribute('href', "data:text/plain;charset=utf-8," + editor.getValue());
        anchor.setAttribute('download', filename);
      
        document.body.appendChild(anchor);

        anchor.click();
        document.body.removeChild(anchor);
    };

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return Array.isArray(val);
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return toString.call(val) === '[object FormData]';
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return toString.call(val) === '[object URLSearchParams]';
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code,
          status: this.response && this.response.status ? this.response.status : null
        };
      };
      return error;
    };

    var transitional = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;
        var responseType = config.responseType;
        var onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }

          if (config.signal) {
            config.signal.removeEventListener('abort', onCanceled);
          }
        }

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
            request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(function _resolve(value) {
            resolve(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);

          // Clean up request
          request = null;
        }

        if ('onloadend' in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
              return;
            }
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
          var transitional$1 = config.transitional || transitional;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(
            timeoutErrorMessage,
            config,
            transitional$1.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (responseType && responseType !== 'json') {
          request.responseType = config.responseType;
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken || config.signal) {
          // Handle cancellation
          // eslint-disable-next-line func-names
          onCanceled = function(cancel) {
            if (!request) {
              return;
            }
            reject(!cancel || (cancel && cancel.type) ? new Cancel_1('canceled') : cancel);
            request.abort();
            request = null;
          };

          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
          }
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    function stringifySafely(rawValue, parser, encoder) {
      if (utils.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils.trim(rawValue);
        } catch (e) {
          if (e.name !== 'SyntaxError') {
            throw e;
          }
        }
      }

      return (encoder || JSON.stringify)(rawValue);
    }

    var defaults = {

      transitional: transitional,

      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');

        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
          setContentTypeIfUnset(headers, 'application/json');
          return stringifySafely(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        var transitional = this.transitional || defaults.transitional;
        var silentJSONParsing = transitional && transitional.silentJSONParsing;
        var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

        if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === 'SyntaxError') {
                throw enhanceError(e, this, 'E_JSON_PARSE');
              }
              throw e;
            }
          }
        }

        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },

      headers: {
        common: {
          'Accept': 'application/json, text/plain, */*'
        }
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      var context = this || defaults_1;
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn.call(context, data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }

      if (config.signal && config.signal.aborted) {
        throw new Cancel_1('canceled');
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData.call(
        config,
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData.call(
          config,
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      // eslint-disable-next-line consistent-return
      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(undefined, config2[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function mergeDirectKeys(prop) {
        if (prop in config2) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      var mergeMap = {
        'url': valueFromConfig2,
        'method': valueFromConfig2,
        'data': valueFromConfig2,
        'baseURL': defaultToConfig2,
        'transformRequest': defaultToConfig2,
        'transformResponse': defaultToConfig2,
        'paramsSerializer': defaultToConfig2,
        'timeout': defaultToConfig2,
        'timeoutMessage': defaultToConfig2,
        'withCredentials': defaultToConfig2,
        'adapter': defaultToConfig2,
        'responseType': defaultToConfig2,
        'xsrfCookieName': defaultToConfig2,
        'xsrfHeaderName': defaultToConfig2,
        'onUploadProgress': defaultToConfig2,
        'onDownloadProgress': defaultToConfig2,
        'decompress': defaultToConfig2,
        'maxContentLength': defaultToConfig2,
        'maxBodyLength': defaultToConfig2,
        'transport': defaultToConfig2,
        'httpAgent': defaultToConfig2,
        'httpsAgent': defaultToConfig2,
        'cancelToken': defaultToConfig2,
        'socketPath': defaultToConfig2,
        'responseEncoding': defaultToConfig2,
        'validateStatus': mergeDirectKeys
      };

      utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
        var merge = mergeMap[prop] || mergeDeepProperties;
        var configValue = merge(prop);
        (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
      });

      return config;
    };

    var data = {
      "version": "0.26.1"
    };

    var VERSION = data.version;

    var validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
    });

    var deprecatedWarnings = {};

    /**
     * Transitional option validator
     * @param {function|boolean?} validator - set to false if the transitional option has been removed
     * @param {string?} version - deprecated version / removed since version
     * @param {string?} message - some message with additional info
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }

      // eslint-disable-next-line func-names
      return function(value, opt, opts) {
        if (validator === false) {
          throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')));
        }

        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          // eslint-disable-next-line no-console
          console.warn(
            formatMessage(
              opt,
              ' has been deprecated since v' + version + ' and will be removed in the near future'
            )
          );
        }

        return validator ? validator(value, opt, opts) : true;
      };
    };

    /**
     * Assert object's properties type
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     */

    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
        throw new TypeError('options must be an object');
      }
      var keys = Object.keys(options);
      var i = keys.length;
      while (i-- > 0) {
        var opt = keys[i];
        var validator = schema[opt];
        if (validator) {
          var value = options[opt];
          var result = value === undefined || validator(value, opt, options);
          if (result !== true) {
            throw new TypeError('option ' + opt + ' must be ' + result);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw Error('Unknown option ' + opt);
        }
      }
    }

    var validator = {
      assertOptions: assertOptions,
      validators: validators$1
    };

    var validators = validator.validators;
    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(configOrUrl, config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof configOrUrl === 'string') {
        config = config || {};
        config.url = configOrUrl;
      } else {
        config = configOrUrl || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      var transitional = config.transitional;

      if (transitional !== undefined) {
        validator.assertOptions(transitional, {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean)
        }, false);
      }

      // filter out skipped interceptors
      var requestInterceptorChain = [];
      var synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
          return;
        }

        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      var responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      });

      var promise;

      if (!synchronousRequestInterceptors) {
        var chain = [dispatchRequest, undefined];

        Array.prototype.unshift.apply(chain, requestInterceptorChain);
        chain = chain.concat(responseInterceptorChain);

        promise = Promise.resolve(config);
        while (chain.length) {
          promise = promise.then(chain.shift(), chain.shift());
        }

        return promise;
      }


      var newConfig = config;
      while (requestInterceptorChain.length) {
        var onFulfilled = requestInterceptorChain.shift();
        var onRejected = requestInterceptorChain.shift();
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected(error);
          break;
        }
      }

      try {
        promise = dispatchRequest(newConfig);
      } catch (error) {
        return Promise.reject(error);
      }

      while (responseInterceptorChain.length) {
        promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;

      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;

      // eslint-disable-next-line func-names
      this.promise.then(function(cancel) {
        if (!token._listeners) return;

        var i;
        var l = token._listeners.length;

        for (i = 0; i < l; i++) {
          token._listeners[i](cancel);
        }
        token._listeners = null;
      });

      // eslint-disable-next-line func-names
      this.promise.then = function(onfulfilled) {
        var _resolve;
        // eslint-disable-next-line func-names
        var promise = new Promise(function(resolve) {
          token.subscribe(resolve);
          _resolve = resolve;
        }).then(onfulfilled);

        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };

        return promise;
      };

      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Subscribe to the cancel signal
     */

    CancelToken.prototype.subscribe = function subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }

      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    };

    /**
     * Unsubscribe from the cancel signal
     */

    CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      var index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return utils.isObject(payload) && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      // Factory for creating new instances
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios_1;

    // Expose Cancel & CancelToken
    axios$1.Cancel = Cancel_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel;
    axios$1.VERSION = data.version;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    // Expose isAxiosError
    axios$1.isAxiosError = isAxiosError;

    var axios_1 = axios$1;

    // Allow use of default import syntax in TypeScript
    var _default = axios$1;
    axios_1.default = _default;

    var axios = axios_1;

    const submit= async (e)=>{
        let code=get_store_value(EditorStore).getValue();
        console.log(code);
        let lang=document.getElementById('lang').value;
        console.log(lang);
        let withinput=e;
        console.log(withinput);
        let input=document.getElementById('input').value;
        console.log(input);

        const payload={
            code,
            lang,
            withinput,
            input
        };

         const {data}= await axios.post("/compile",payload);
        console.log(output);
        if(data.output)
        {
            
            document.getElementById('output').style.backgroundColor="lightgreen";
            document.getElementById('output').innerHTML=data.output;
        }
        else
        {
            console.log(data.error);
            document.getElementById('output').style.backgroundColor="#ffcccb";
            document.getElementById('output').innerHTML=data.error;    }
         
        

    };

    /* node_modules\svelte-switch\src\components\CheckedIcon.svelte generated by Svelte v3.46.4 */

    const file$6 = "node_modules\\svelte-switch\\src\\components\\CheckedIcon.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M11.264 0L5.26 6.004 2.103 2.847 0 4.95l5.26 5.26 8.108-8.107L11.264 0");
    			attr_dev(path, "fill", "#fff");
    			attr_dev(path, "fillrule", "evenodd");
    			add_location(path, file$6, 5, 2, 105);
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "viewBox", "-2 -5 17 21");
    			set_style(svg, "position", "absolute");
    			set_style(svg, "top", "0");
    			add_location(svg, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CheckedIcon', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CheckedIcon> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class CheckedIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CheckedIcon",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* node_modules\svelte-switch\src\components\UncheckedIcon.svelte generated by Svelte v3.46.4 */

    const file$5 = "node_modules\\svelte-switch\\src\\components\\UncheckedIcon.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M9.9 2.12L7.78 0 4.95 2.828 2.12 0 0 2.12l2.83 2.83L0 7.776 2.123 9.9\r\n    4.95 7.07 7.78 9.9 9.9 7.776 7.072 4.95 9.9 2.12");
    			attr_dev(path, "fill", "#fff");
    			attr_dev(path, "fillrule", "evenodd");
    			add_location(path, file$5, 5, 2, 106);
    			attr_dev(svg, "viewBox", "-2 -5 14 20");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "width", "100%");
    			set_style(svg, "position", "absolute");
    			set_style(svg, "top", "0");
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('UncheckedIcon', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<UncheckedIcon> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class UncheckedIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UncheckedIcon",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    function createBackgroundColor(
      pos,
      checkedPos,
      uncheckedPos,
      offColor,
      onColor
    ) {
      const relativePos = (pos - uncheckedPos) / (checkedPos - uncheckedPos);
      if (relativePos === 0) {
        return offColor;
      }
      if (relativePos === 1) {
        return onColor;
      }

      let newColor = "#";
      for (let i = 1; i < 6; i += 2) {
        const offComponent = parseInt(offColor.substr(i, 2), 16);
        const onComponent = parseInt(onColor.substr(i, 2), 16);
        const weightedValue = Math.round(
          (1 - relativePos) * offComponent + relativePos * onComponent
        );
        let newComponent = weightedValue.toString(16);
        if (newComponent.length === 1) {
          newComponent = `0${newComponent}`;
        }
        newColor += newComponent;
      }
      return newColor;
    }

    function convertShorthandColor(color) {
      if (color.length === 7) {
        return color;
      }
      let sixDigitColor = "#";
      for (let i = 1; i < 4; i += 1) {
        sixDigitColor += color[i] + color[i];
      }
      return sixDigitColor;
    }

    function getBackgroundColor(
      pos,
      checkedPos,
      uncheckedPos,
      offColor,
      onColor
    ) {
      const sixDigitOffColor = convertShorthandColor(offColor);
      const sixDigitOnColor = convertShorthandColor(onColor);
      return createBackgroundColor(
        pos,
        checkedPos,
        uncheckedPos,
        sixDigitOffColor,
        sixDigitOnColor
      );
    }

    /* node_modules\svelte-switch\src\components\Switch.svelte generated by Svelte v3.46.4 */
    const file$4 = "node_modules\\svelte-switch\\src\\components\\Switch.svelte";
    const get_unCheckedIcon_slot_changes = dirty => ({});
    const get_unCheckedIcon_slot_context = ctx => ({});
    const get_checkedIcon_slot_changes = dirty => ({});
    const get_checkedIcon_slot_context = ctx => ({});

    // (313:31)           
    function fallback_block_1(ctx) {
    	let cicon;
    	let current;
    	cicon = new /*CIcon*/ ctx[18]({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(cicon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cicon, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cicon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_1.name,
    		type: "fallback",
    		source: "(313:31)           ",
    		ctx
    	});

    	return block;
    }

    // (318:33)           
    function fallback_block(ctx) {
    	let uicon;
    	let current;
    	uicon = new /*UIcon*/ ctx[19]({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(uicon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(uicon, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(uicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(uicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(uicon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(318:33)           ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div4;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div3;
    	let t2;
    	let input;
    	let current;
    	let mounted;
    	let dispose;
    	const checkedIcon_slot_template = /*#slots*/ ctx[35].checkedIcon;
    	const checkedIcon_slot = create_slot(checkedIcon_slot_template, ctx, /*$$scope*/ ctx[34], get_checkedIcon_slot_context);
    	const checkedIcon_slot_or_fallback = checkedIcon_slot || fallback_block_1(ctx);
    	const unCheckedIcon_slot_template = /*#slots*/ ctx[35].unCheckedIcon;
    	const unCheckedIcon_slot = create_slot(unCheckedIcon_slot_template, ctx, /*$$scope*/ ctx[34], get_unCheckedIcon_slot_context);
    	const unCheckedIcon_slot_or_fallback = unCheckedIcon_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			if (checkedIcon_slot_or_fallback) checkedIcon_slot_or_fallback.c();
    			t0 = space();
    			div1 = element("div");
    			if (unCheckedIcon_slot_or_fallback) unCheckedIcon_slot_or_fallback.c();
    			t1 = space();
    			div3 = element("div");
    			t2 = space();
    			input = element("input");
    			attr_dev(div0, "style", /*checkedIconStyle*/ ctx[5]);
    			add_location(div0, file$4, 311, 4, 8377);
    			attr_dev(div1, "style", /*uncheckedIconStyle*/ ctx[6]);
    			add_location(div1, file$4, 316, 4, 8492);
    			attr_dev(div2, "class", "react-switch-bg");
    			attr_dev(div2, "style", /*backgroundStyle*/ ctx[4]);
    			attr_dev(div2, "onmousedown", func);
    			add_location(div2, file$4, 306, 2, 8223);
    			attr_dev(div3, "class", "react-switch-handle");
    			attr_dev(div3, "style", /*handleStyle*/ ctx[7]);
    			add_location(div3, file$4, 322, 2, 8619);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "role", "switch");
    			input.disabled = /*disabled*/ ctx[0];
    			attr_dev(input, "style", /*inputStyle*/ ctx[8]);
    			add_location(input, file$4, 331, 2, 8984);
    			attr_dev(div4, "class", /*containerClass*/ ctx[1]);
    			attr_dev(div4, "style", /*rootStyle*/ ctx[3]);
    			add_location(div4, file$4, 305, 0, 8173);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, div0);

    			if (checkedIcon_slot_or_fallback) {
    				checkedIcon_slot_or_fallback.m(div0, null);
    			}

    			append_dev(div2, t0);
    			append_dev(div2, div1);

    			if (unCheckedIcon_slot_or_fallback) {
    				unCheckedIcon_slot_or_fallback.m(div1, null);
    			}

    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div4, t2);
    			append_dev(div4, input);
    			/*input_binding*/ ctx[36](input);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div2,
    						"click",
    						function () {
    							if (is_function(/*disabled*/ ctx[0] ? null : /*onClick*/ ctx[17])) (/*disabled*/ ctx[0] ? null : /*onClick*/ ctx[17]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(div3, "click", click_handler, false, false, false),
    					listen_dev(
    						div3,
    						"mousedown",
    						function () {
    							if (is_function(/*disabled*/ ctx[0] ? null : /*onMouseDown*/ ctx[9])) (/*disabled*/ ctx[0] ? null : /*onMouseDown*/ ctx[9]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div3,
    						"touchstart",
    						function () {
    							if (is_function(/*disabled*/ ctx[0] ? null : /*onTouchStart*/ ctx[10])) (/*disabled*/ ctx[0] ? null : /*onTouchStart*/ ctx[10]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div3,
    						"touchmove",
    						function () {
    							if (is_function(/*disabled*/ ctx[0] ? null : /*onTouchMove*/ ctx[11])) (/*disabled*/ ctx[0] ? null : /*onTouchMove*/ ctx[11]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div3,
    						"touchend",
    						function () {
    							if (is_function(/*disabled*/ ctx[0] ? null : /*onTouchEnd*/ ctx[12])) (/*disabled*/ ctx[0] ? null : /*onTouchEnd*/ ctx[12]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div3,
    						"touchcancel",
    						function () {
    							if (is_function(/*disabled*/ ctx[0] ? null : /*unsetHasOutline*/ ctx[16])) (/*disabled*/ ctx[0] ? null : /*unsetHasOutline*/ ctx[16]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input, "focus", /*setHasOutline*/ ctx[15], false, false, false),
    					listen_dev(input, "blur", /*unsetHasOutline*/ ctx[16], false, false, false),
    					listen_dev(input, "keyup", /*onKeyUp*/ ctx[14], false, false, false),
    					listen_dev(input, "change", /*onInputChange*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (checkedIcon_slot) {
    				if (checkedIcon_slot.p && (!current || dirty[1] & /*$$scope*/ 8)) {
    					update_slot_base(
    						checkedIcon_slot,
    						checkedIcon_slot_template,
    						ctx,
    						/*$$scope*/ ctx[34],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[34])
    						: get_slot_changes(checkedIcon_slot_template, /*$$scope*/ ctx[34], dirty, get_checkedIcon_slot_changes),
    						get_checkedIcon_slot_context
    					);
    				}
    			}

    			if (!current || dirty[0] & /*checkedIconStyle*/ 32) {
    				attr_dev(div0, "style", /*checkedIconStyle*/ ctx[5]);
    			}

    			if (unCheckedIcon_slot) {
    				if (unCheckedIcon_slot.p && (!current || dirty[1] & /*$$scope*/ 8)) {
    					update_slot_base(
    						unCheckedIcon_slot,
    						unCheckedIcon_slot_template,
    						ctx,
    						/*$$scope*/ ctx[34],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[34])
    						: get_slot_changes(unCheckedIcon_slot_template, /*$$scope*/ ctx[34], dirty, get_unCheckedIcon_slot_changes),
    						get_unCheckedIcon_slot_context
    					);
    				}
    			}

    			if (!current || dirty[0] & /*uncheckedIconStyle*/ 64) {
    				attr_dev(div1, "style", /*uncheckedIconStyle*/ ctx[6]);
    			}

    			if (!current || dirty[0] & /*backgroundStyle*/ 16) {
    				attr_dev(div2, "style", /*backgroundStyle*/ ctx[4]);
    			}

    			if (!current || dirty[0] & /*handleStyle*/ 128) {
    				attr_dev(div3, "style", /*handleStyle*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*disabled*/ 1) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*inputStyle*/ 256) {
    				attr_dev(input, "style", /*inputStyle*/ ctx[8]);
    			}

    			if (!current || dirty[0] & /*containerClass*/ 2) {
    				attr_dev(div4, "class", /*containerClass*/ ctx[1]);
    			}

    			if (!current || dirty[0] & /*rootStyle*/ 8) {
    				attr_dev(div4, "style", /*rootStyle*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(checkedIcon_slot_or_fallback, local);
    			transition_in(unCheckedIcon_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(checkedIcon_slot_or_fallback, local);
    			transition_out(unCheckedIcon_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (checkedIcon_slot_or_fallback) checkedIcon_slot_or_fallback.d(detaching);
    			if (unCheckedIcon_slot_or_fallback) unCheckedIcon_slot_or_fallback.d(detaching);
    			/*input_binding*/ ctx[36](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = e => e.preventDefault();
    const click_handler = e => e.preventDefault();

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Switch', slots, ['checkedIcon','unCheckedIcon']);
    	let { checked } = $$props;
    	let { disabled = false } = $$props;
    	let { offColor = "#888" } = $$props;
    	let { onColor = "#080" } = $$props;
    	let { offHandleColor = "#fff" } = $$props;
    	let { onHandleColor = "#fff" } = $$props;
    	let { handleDiameter } = $$props;
    	let { unCheckedIcon = UncheckedIcon } = $$props;
    	let { checkedIcon = CheckedIcon } = $$props;
    	let { boxShadow = null } = $$props;
    	let { activeBoxShadow = "0 0 2px 3px #3bf" } = $$props;
    	let { height = 28 } = $$props;
    	let { width = 56 } = $$props;
    	let { id = "" } = $$props;
    	let { containerClass = "" } = $$props;
    	const dispatch = createEventDispatcher();

    	//state
    	let state = {
    		handleDiameter: 0,
    		checkedPos: 0,
    		uncheckedPos: 0,
    		pos: 0,
    		lastDragAt: 0,
    		lastKeyUpAt: 0,
    		startX: null,
    		hasOutline: null,
    		dragStartingTime: null,
    		checkedStateFromDragging: false
    	};

    	let inputRef = null;
    	state.handleDiameter = handleDiameter || height - 2;
    	state.checkedPos = Math.max(width - height, width - (height + state.handleDiameter) / 2);
    	state.uncheckedPos = Math.max(0, (height - state.handleDiameter) / 2);
    	state.pos = checked ? state.checkedPos : state.uncheckedPos;
    	state.lastDragAt = 0;
    	state.lastKeyUpAt = 0;

    	//event handlers
    	function onDragStart(clientX) {
    		inputRef && inputRef.focus && inputRef.focus();
    		$$invalidate(33, state.startX = clientX, state);
    		$$invalidate(33, state.hasOutline = true, state);
    		$$invalidate(33, state.dragStartingTime = Date.now(), state);
    	}

    	function onDrag(clientX) {
    		let { startX, isDragging, pos } = state;
    		const startPos = checked ? state.checkedPos : state.uncheckedPos;
    		const mousePos = startPos + clientX - startX;

    		// We need this check to fix a windows glitch where onDrag is triggered onMouseDown in some cases
    		if (!isDragging && clientX !== startX) {
    			$$invalidate(33, state.isDragging = true, state);
    		}

    		const newPos = Math.min(state.checkedPos, Math.max(state.uncheckedPos, mousePos));

    		// Prevent unnecessary rerenders
    		if (newPos !== pos) {
    			$$invalidate(33, state.pos = newPos, state);
    		}
    	}

    	function onDragStop(event) {
    		let { pos, isDragging, dragStartingTime } = state;
    		const halfwayCheckpoint = (state.checkedPos + state.uncheckedPos) / 2;

    		// Simulate clicking the handle
    		const timeSinceStart = Date.now() - dragStartingTime;

    		if (!isDragging || timeSinceStart < 250) {
    			onChangeTrigger(event);
    		} else if (checked) {
    			if (pos > halfwayCheckpoint) {
    				$$invalidate(33, state.pos = state.checkedPos, state); // Handle dragging from checked position
    			} else {
    				onChangeTrigger(event);
    			}
    		} else if (pos < halfwayCheckpoint) {
    			$$invalidate(33, state.pos = state.uncheckedPos, state); // Handle dragging from unchecked position
    		} else {
    			onChangeTrigger(event);
    		}

    		$$invalidate(33, state.isDragging = false, state);
    		$$invalidate(33, state.hasOutline = false, state);
    		$$invalidate(33, state.lastDragAt = Date.now(), state);
    	}

    	function onMouseDown(event) {
    		event.preventDefault();

    		// Ignore right click and scroll
    		if (typeof event.button === "number" && event.button !== 0) {
    			return;
    		}

    		onDragStart(event.clientX);
    		window.addEventListener("mousemove", onMouseMove);
    		window.addEventListener("mouseup", onMouseUp);
    	}

    	function onMouseMove(event) {
    		event.preventDefault();
    		onDrag(event.clientX);
    	}

    	function onMouseUp(event) {
    		onDragStop(event);
    		window.removeEventListener("mousemove", onMouseMove);
    		window.removeEventListener("mouseup", onMouseUp);
    	}

    	function onTouchStart(event) {
    		$$invalidate(33, state.checkedStateFromDragging = null, state);
    		onDragStart(event.touches[0].clientX);
    	}

    	function onTouchMove(event) {
    		onDrag(event.touches[0].clientX);
    	}

    	function onTouchEnd(event) {
    		event.preventDefault();
    		onDragStop(event);
    	}

    	function onInputChange(event) {
    		// This condition is unfortunately needed in some browsers where the input's change event might get triggered
    		// right after the dragstop event is triggered (occurs when dropping over a label element)
    		if (Date.now() - state.lastDragAt > 50) {
    			onChangeTrigger(event);

    			// Prevent clicking label, but not key activation from setting outline to true - yes, this is absurd
    			if (Date.now() - state.lastKeyUpAt > 50) {
    				$$invalidate(33, state.hasOutline = false, state);
    			}
    		}
    	}

    	function onKeyUp() {
    		$$invalidate(33, state.lastKeyUpAt = Date.now(), state);
    	}

    	function setHasOutline() {
    		$$invalidate(33, state.hasOutline = true, state);
    	}

    	function unsetHasOutline() {
    		$$invalidate(33, state.hasOutline = false, state);
    	}

    	function onClick(event) {
    		event.preventDefault();
    		inputRef.focus();
    		onChangeTrigger(event);
    		$$invalidate(33, state.hasOutline = false, state);
    	}

    	function onChangeTrigger(event) {
    		$$invalidate(20, checked = !checked);
    		dispatch("change", { checked, event, id });
    	}

    	//Hack since components should always to starting with Capital letter and props are camelCasing
    	let CIcon = checkedIcon;

    	let UIcon = unCheckedIcon;

    	//styles
    	let rootStyle = "";

    	let backgroundStyle = "";
    	let checkedIconStyle = "";
    	let uncheckedIconStyle = "";
    	let handleStyle = "";
    	let inputStyle = "";

    	const writable_props = [
    		'checked',
    		'disabled',
    		'offColor',
    		'onColor',
    		'offHandleColor',
    		'onHandleColor',
    		'handleDiameter',
    		'unCheckedIcon',
    		'checkedIcon',
    		'boxShadow',
    		'activeBoxShadow',
    		'height',
    		'width',
    		'id',
    		'containerClass'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Switch> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputRef = $$value;
    			$$invalidate(2, inputRef);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('checked' in $$props) $$invalidate(20, checked = $$props.checked);
    		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ('offColor' in $$props) $$invalidate(21, offColor = $$props.offColor);
    		if ('onColor' in $$props) $$invalidate(22, onColor = $$props.onColor);
    		if ('offHandleColor' in $$props) $$invalidate(23, offHandleColor = $$props.offHandleColor);
    		if ('onHandleColor' in $$props) $$invalidate(24, onHandleColor = $$props.onHandleColor);
    		if ('handleDiameter' in $$props) $$invalidate(25, handleDiameter = $$props.handleDiameter);
    		if ('unCheckedIcon' in $$props) $$invalidate(26, unCheckedIcon = $$props.unCheckedIcon);
    		if ('checkedIcon' in $$props) $$invalidate(27, checkedIcon = $$props.checkedIcon);
    		if ('boxShadow' in $$props) $$invalidate(28, boxShadow = $$props.boxShadow);
    		if ('activeBoxShadow' in $$props) $$invalidate(29, activeBoxShadow = $$props.activeBoxShadow);
    		if ('height' in $$props) $$invalidate(30, height = $$props.height);
    		if ('width' in $$props) $$invalidate(31, width = $$props.width);
    		if ('id' in $$props) $$invalidate(32, id = $$props.id);
    		if ('containerClass' in $$props) $$invalidate(1, containerClass = $$props.containerClass);
    		if ('$$scope' in $$props) $$invalidate(34, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		createEventDispatcher,
    		defaultCheckedIcon: CheckedIcon,
    		defaultUncheckedIcon: UncheckedIcon,
    		getBackgroundColor,
    		checked,
    		disabled,
    		offColor,
    		onColor,
    		offHandleColor,
    		onHandleColor,
    		handleDiameter,
    		unCheckedIcon,
    		checkedIcon,
    		boxShadow,
    		activeBoxShadow,
    		height,
    		width,
    		id,
    		containerClass,
    		dispatch,
    		state,
    		inputRef,
    		onDragStart,
    		onDrag,
    		onDragStop,
    		onMouseDown,
    		onMouseMove,
    		onMouseUp,
    		onTouchStart,
    		onTouchMove,
    		onTouchEnd,
    		onInputChange,
    		onKeyUp,
    		setHasOutline,
    		unsetHasOutline,
    		onClick,
    		onChangeTrigger,
    		CIcon,
    		UIcon,
    		rootStyle,
    		backgroundStyle,
    		checkedIconStyle,
    		uncheckedIconStyle,
    		handleStyle,
    		inputStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ('checked' in $$props) $$invalidate(20, checked = $$props.checked);
    		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ('offColor' in $$props) $$invalidate(21, offColor = $$props.offColor);
    		if ('onColor' in $$props) $$invalidate(22, onColor = $$props.onColor);
    		if ('offHandleColor' in $$props) $$invalidate(23, offHandleColor = $$props.offHandleColor);
    		if ('onHandleColor' in $$props) $$invalidate(24, onHandleColor = $$props.onHandleColor);
    		if ('handleDiameter' in $$props) $$invalidate(25, handleDiameter = $$props.handleDiameter);
    		if ('unCheckedIcon' in $$props) $$invalidate(26, unCheckedIcon = $$props.unCheckedIcon);
    		if ('checkedIcon' in $$props) $$invalidate(27, checkedIcon = $$props.checkedIcon);
    		if ('boxShadow' in $$props) $$invalidate(28, boxShadow = $$props.boxShadow);
    		if ('activeBoxShadow' in $$props) $$invalidate(29, activeBoxShadow = $$props.activeBoxShadow);
    		if ('height' in $$props) $$invalidate(30, height = $$props.height);
    		if ('width' in $$props) $$invalidate(31, width = $$props.width);
    		if ('id' in $$props) $$invalidate(32, id = $$props.id);
    		if ('containerClass' in $$props) $$invalidate(1, containerClass = $$props.containerClass);
    		if ('state' in $$props) $$invalidate(33, state = $$props.state);
    		if ('inputRef' in $$props) $$invalidate(2, inputRef = $$props.inputRef);
    		if ('CIcon' in $$props) $$invalidate(18, CIcon = $$props.CIcon);
    		if ('UIcon' in $$props) $$invalidate(19, UIcon = $$props.UIcon);
    		if ('rootStyle' in $$props) $$invalidate(3, rootStyle = $$props.rootStyle);
    		if ('backgroundStyle' in $$props) $$invalidate(4, backgroundStyle = $$props.backgroundStyle);
    		if ('checkedIconStyle' in $$props) $$invalidate(5, checkedIconStyle = $$props.checkedIconStyle);
    		if ('uncheckedIconStyle' in $$props) $$invalidate(6, uncheckedIconStyle = $$props.uncheckedIconStyle);
    		if ('handleStyle' in $$props) $$invalidate(7, handleStyle = $$props.handleStyle);
    		if ('inputStyle' in $$props) $$invalidate(8, inputStyle = $$props.inputStyle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*checked*/ 1048576 | $$self.$$.dirty[1] & /*state*/ 4) {
    			if (!state.isDragging) {
    				$$invalidate(33, state.pos = checked ? state.checkedPos : state.uncheckedPos, state);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*disabled, height*/ 1073741825) {
    			$$invalidate(3, rootStyle = `
    position: relative;
    display: inline-block;
    text-align: left;
    opacity: ${disabled ? 0.5 : 1};
    direction: ltr;
    border-radius: ${height / 2}px;
    transition: opacity 0.25s;
    touch-action: none;
    webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    user-select: none;
  `);
    		}

    		if ($$self.$$.dirty[0] & /*height, offColor, onColor, disabled*/ 1080033281 | $$self.$$.dirty[1] & /*width, state*/ 5) {
    			$$invalidate(4, backgroundStyle = `
    height: ${height}px;
    width: ${width}px;
    margin: ${Math.max(0, (state.handleDiameter - height) / 2)}px;
    position: relative;
    background: ${getBackgroundColor(state.pos, state.checkedPos, state.uncheckedPos, offColor, onColor)};
    border-radius: ${height / 2}px;
    cursor: ${disabled ? "default" : "pointer"};
    transition: ${state.isDragging ? null : "background 0.25s"};
  `);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 1073741824 | $$self.$$.dirty[1] & /*width, state*/ 5) {
    			$$invalidate(5, checkedIconStyle = `
    height: ${height}px;
    width: ${Math.min(height * 1.5, width - (state.handleDiameter + height) / 2 + 1)}px;
    position: relative;
    opacity:
      ${(state.pos - state.uncheckedPos) / (state.checkedPos - state.uncheckedPos)};
    pointer-events: none;
    transition: ${state.isDragging ? null : "opacity 0.25s"};
  `);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 1073741824 | $$self.$$.dirty[1] & /*width, state*/ 5) {
    			$$invalidate(6, uncheckedIconStyle = `
    height: ${height}px;
    width: ${Math.min(height * 1.5, width - (state.handleDiameter + height) / 2 + 1)}px;
    position: absolute;
    opacity:
      ${1 - (state.pos - state.uncheckedPos) / (state.checkedPos - state.uncheckedPos)};
    right: 0px;
    top: 0px;
    pointer-events: none;
    transition: ${state.isDragging ? null : "opacity 0.25s"};
  `);
    		}

    		if ($$self.$$.dirty[0] & /*offHandleColor, onHandleColor, disabled, height, activeBoxShadow, boxShadow*/ 1904214017 | $$self.$$.dirty[1] & /*state*/ 4) {
    			$$invalidate(7, handleStyle = `
    height: ${state.handleDiameter}px;
    width: ${state.handleDiameter}px;
    background: ${getBackgroundColor(state.pos, state.checkedPos, state.uncheckedPos, offHandleColor, onHandleColor)};
    display: inline-block;
    cursor: ${disabled ? "default" : "pointer"};
    border-radius: 50%;
    position: absolute;
    transform: translateX(${state.pos}px);
    top: ${Math.max(0, (height - state.handleDiameter) / 2)}px;
    outline: 0;
    box-shadow: ${state.hasOutline ? activeBoxShadow : boxShadow};
    border: 0;
    transition: ${state.isDragging
			? null
			: "background-color 0.25s, transform 0.25s, box-shadow 0.15s"};
  `);
    		}
    	};

    	$$invalidate(8, inputStyle = `
    border: 0px;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0px;
    position: absolute;
    width: 1px;
  `);

    	return [
    		disabled,
    		containerClass,
    		inputRef,
    		rootStyle,
    		backgroundStyle,
    		checkedIconStyle,
    		uncheckedIconStyle,
    		handleStyle,
    		inputStyle,
    		onMouseDown,
    		onTouchStart,
    		onTouchMove,
    		onTouchEnd,
    		onInputChange,
    		onKeyUp,
    		setHasOutline,
    		unsetHasOutline,
    		onClick,
    		CIcon,
    		UIcon,
    		checked,
    		offColor,
    		onColor,
    		offHandleColor,
    		onHandleColor,
    		handleDiameter,
    		unCheckedIcon,
    		checkedIcon,
    		boxShadow,
    		activeBoxShadow,
    		height,
    		width,
    		id,
    		state,
    		$$scope,
    		slots,
    		input_binding
    	];
    }

    class Switch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{
    				checked: 20,
    				disabled: 0,
    				offColor: 21,
    				onColor: 22,
    				offHandleColor: 23,
    				onHandleColor: 24,
    				handleDiameter: 25,
    				unCheckedIcon: 26,
    				checkedIcon: 27,
    				boxShadow: 28,
    				activeBoxShadow: 29,
    				height: 30,
    				width: 31,
    				id: 32,
    				containerClass: 1
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Switch",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*checked*/ ctx[20] === undefined && !('checked' in props)) {
    			console.warn("<Switch> was created without expected prop 'checked'");
    		}

    		if (/*handleDiameter*/ ctx[25] === undefined && !('handleDiameter' in props)) {
    			console.warn("<Switch> was created without expected prop 'handleDiameter'");
    		}
    	}

    	get checked() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checked(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offColor() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offColor(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onColor() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onColor(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offHandleColor() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offHandleColor(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onHandleColor() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onHandleColor(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleDiameter() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleDiameter(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get unCheckedIcon() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set unCheckedIcon(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get checkedIcon() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checkedIcon(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get boxShadow() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set boxShadow(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get activeBoxShadow() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeBoxShadow(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerClass() {
    		throw new Error("<Switch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerClass(value) {
    		throw new Error("<Switch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\SideNav.svelte generated by Svelte v3.46.4 */
    const file$3 = "src\\components\\SideNav.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let i0;
    	let t0;
    	let i1;
    	let t1;
    	let button;
    	let t3;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t8;
    	let switch_1;
    	let updating_checked;
    	let current;
    	let mounted;
    	let dispose;

    	function switch_1_checked_binding(value) {
    		/*switch_1_checked_binding*/ ctx[4](value);
    	}

    	let switch_1_props = { id: "withInput" };

    	if (/*withInput*/ ctx[0] !== void 0) {
    		switch_1_props.checked = /*withInput*/ ctx[0];
    	}

    	switch_1 = new Switch({ props: switch_1_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(switch_1, 'checked', switch_1_checked_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			i0 = element("i");
    			t0 = space();
    			i1 = element("i");
    			t1 = space();
    			button = element("button");
    			button.textContent = "RUN";
    			t3 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "C";
    			option1 = element("option");
    			option1.textContent = "Cpp";
    			option2 = element("option");
    			option2.textContent = "Python";
    			option3 = element("option");
    			option3.textContent = "Java";
    			t8 = space();
    			create_component(switch_1.$$.fragment);
    			attr_dev(i0, "class", "fa fa-download icons svelte-8z2fo7");
    			add_location(i0, file$3, 17, 4, 462);
    			attr_dev(i1, "class", "fa fa-plus icons svelte-8z2fo7");
    			add_location(i1, file$3, 18, 4, 526);
    			add_location(button, file$3, 19, 4, 608);
    			option0.__value = "C";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 23, 2, 696);
    			option1.__value = "Cpp ";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 24, 2, 728);
    			option2.__value = "Python";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 25, 2, 765);
    			option3.__value = "Java";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 26, 2, 807);
    			attr_dev(select, "name", "lang");
    			attr_dev(select, "id", "lang");
    			add_location(select, file$3, 22, 2, 662);
    			attr_dev(div, "class", "side-bar svelte-8z2fo7");
    			add_location(div, file$3, 16, 2, 434);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i0);
    			append_dev(div, t0);
    			append_dev(div, i1);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(div, t3);
    			append_dev(div, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(div, t8);
    			mount_component(switch_1, div, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(i0, "click", /*downloadCode*/ ctx[1], false, false, false),
    					listen_dev(i1, "click", /*click_handler*/ ctx[3], false, false, false),
    					listen_dev(button, "click", /*submitCode*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_1_changes = {};

    			if (!updating_checked && dirty & /*withInput*/ 1) {
    				updating_checked = true;
    				switch_1_changes.checked = /*withInput*/ ctx[0];
    				add_flush_callback(() => updating_checked = false);
    			}

    			switch_1.$set(switch_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(switch_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(switch_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(switch_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SideNav', slots, []);
    	let { withInput = false } = $$props;

    	const downloadCode = () => {
    		downloadCodeFromEditor("Code.txt");
    	};

    	const submitCode = () => {
    		submit(withInput);
    	};

    	const writable_props = ['withInput'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SideNav> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => window.location.href = "/";

    	function switch_1_checked_binding(value) {
    		withInput = value;
    		$$invalidate(0, withInput);
    	}

    	$$self.$$set = $$props => {
    		if ('withInput' in $$props) $$invalidate(0, withInput = $$props.withInput);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		downloadCodeFromEditor,
    		submit,
    		Switch,
    		withInput,
    		downloadCode,
    		submitCode
    	});

    	$$self.$inject_state = $$props => {
    		if ('withInput' in $$props) $$invalidate(0, withInput = $$props.withInput);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [withInput, downloadCode, submitCode, click_handler, switch_1_checked_binding];
    }

    class SideNav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { withInput: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SideNav",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get withInput() {
    		throw new Error("<SideNav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set withInput(value) {
    		throw new Error("<SideNav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\CodeEditor.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\components\\CodeEditor.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "code-editor");
    			attr_dev(div, "class", "svelte-w3yyom");
    			add_location(div, file$2, 9, 2, 202);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CodeEditor', slots, []);

    	onMount(() => {
    		InitEditor("code-editor");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CodeEditor> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ InitEditor, onMount });
    	return [];
    }

    class CodeEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CodeEditor",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\Compile.svelte generated by Svelte v3.46.4 */

    const { console: console_1 } = globals;
    const file$1 = "src\\components\\Compile.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let textarea;
    	let t0;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			textarea = element("textarea");
    			t0 = space();
    			p = element("p");
    			p.textContent = "OUTPUT";
    			attr_dev(textarea, "class", "textarea svelte-vd88q3");
    			attr_dev(textarea, "id", "input");
    			attr_dev(textarea, "name", "input");
    			attr_dev(textarea, "rows", "100");
    			attr_dev(textarea, "cols", "70");
    			attr_dev(textarea, "placeholder", "ENTER INPUT HERE");
    			add_location(textarea, file$1, 14, 0, 277);
    			attr_dev(p, "class", "output svelte-vd88q3");
    			attr_dev(p, "id", "output");
    			add_location(p, file$1, 15, 0, 394);
    			attr_dev(div, "class", "inputOutput svelte-vd88q3");
    			add_location(div, file$1, 12, 0, 248);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, textarea);
    			append_dev(div, t0);
    			append_dev(div, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Compile', slots, []);

    	onMount(() => {
    		console.log("dsfhsjdkfhlk");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Compile> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ EditorStore, get: get_store_value, onMount });
    	return [];
    }

    class Compile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Compile",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let header;
    	let t0;
    	let div0;
    	let codeeditor;
    	let t1;
    	let sidenav;
    	let t2;
    	let div1;
    	let compiledetails;
    	let current;

    	header = new Header({
    			props: { imageSrc: "images/wecode2.png" },
    			$$inline: true
    		});

    	codeeditor = new CodeEditor({ $$inline: true });
    	sidenav = new SideNav({ $$inline: true });
    	compiledetails = new Compile({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(codeeditor.$$.fragment);
    			t1 = space();
    			create_component(sidenav.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			create_component(compiledetails.$$.fragment);
    			attr_dev(div0, "class", "wrapper svelte-okw5x9");
    			add_location(div0, file, 8, 2, 296);
    			attr_dev(div1, "class", "input svelte-okw5x9");
    			add_location(div1, file, 12, 2, 362);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(codeeditor, div0, null);
    			append_dev(div0, t1);
    			mount_component(sidenav, div0, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(compiledetails, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(codeeditor.$$.fragment, local);
    			transition_in(sidenav.$$.fragment, local);
    			transition_in(compiledetails.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(codeeditor.$$.fragment, local);
    			transition_out(sidenav.$$.fragment, local);
    			transition_out(compiledetails.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			destroy_component(codeeditor);
    			destroy_component(sidenav);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			destroy_component(compiledetails);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		SideNav,
    		CodeEditor,
    		CompileDetails: Compile
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
