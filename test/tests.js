/*globals test asyncTest expect ok strictEqual stop start Seeds console*/

/* ------------------------------------------------------------------------ */
module('Seeds.StateManager');

test('StateManager implied root state', function() {
	var sm = Seeds.StateManager.create('state1 state2');
	sm.go('state1');
	strictEqual(sm.current, 'state1', 'state navigation');
	sm.go('state2');
	strictEqual(sm.current, 'state2', 'state navigation');
	strictEqual(sm.state('state1').parent, 'root', 'implied root');
	strictEqual(sm.state('state2').parent, 'root', 'implied root');
});

test("StateManager.add(<String>)", function(){
  var sm = Seeds.StateManager.create();
  sm.add('state1 state2');
  sm.add('state1 -> state11 state12');
  strictEqual(sm.state('state11').parent, 'state1', 'added correctly');
});

test("StateManager.add(<Array>)", function(){
  var sm = Seeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> state11 state12'
  ]);
  strictEqual(sm.state('state11').parent, 'state1', 'added correctly');
});

test("StateManager.add(<Object>)", function(){
  var sm = Seeds.StateManager.create();
  sm.add({
    'root': 'state1 state2 state3',
    'state1': 'state11 state12'
  });
  strictEqual(sm.state('state11').parent, 'state1', 'added correctly');
});

test("StateManager.add() variable number of parameters", function() {
  var sm = Seeds.StateManager.create();
  sm.add(
    'state1 state2',
    ['state1 -> state11 state12', 'state2 -> state21 state22'],
    {
      'state1': 'state13 state14',
      'state2': 'state23 state24'
    }
  );
  strictEqual(sm.state('state11').parent, 'state1', 'added correctly');
  strictEqual(sm.state('state12').parent, 'state1', 'added correctly');
  strictEqual(sm.state('state13').parent, 'state1', 'added correctly');
  strictEqual(sm.state('state14').parent, 'state1', 'added correctly');
});

test("StateManager.children()", function() {
  var sm = Seeds.StateManager.create();
  sm.add('a b c', 'a -> a1 a2 a3', 'b -> b1');
  strictEqual(sm.children('root').length, 3, 'root has 3 children');
  strictEqual(sm.children('a').length, 3, 'a has 3 children');
  strictEqual(sm.children('b').length, 1, 'b has 1 children');
  strictEqual(sm.children('c').length, 0, 'c has 0 children');
});

test("StateManager.act() bubbling without return values", function() {
  expect(4);
  var sm = Seeds.StateManager.create('stateA stateB stateC');
  sm.add('stateA -> stateA1 stateA2');
  sm.add('stateB -> stateB1 stateB2');
  sm.add('stateB1 -> stateB11 stateB12');
  sm.add('stateB11 -> stateB11X stateB11Y');
  sm.add('stateB11X -> stateB11XX stateB11XY');

  sm.when({
    'stateB': { action: function() { ok('here!', 'stateB.action');}},
    'stateB1': { action: function() { ok('here!', 'stateB1.action');}},
    'stateB11X': { action: function() { ok('here!', 'stateB11X.action'); }},
    'stateB11XX': { action: function() { ok('here!', 'stateB11XX.action'); }}
  });

  sm.go('stateB11XX');
  sm.act('action');
});

test("StateManager.act() bubbling with return values", function() {
  expect(3);
  var sm = Seeds.StateManager.create('stateA stateB stateC');
  sm.add('stateA -> stateA1 stateA2');
  sm.add('stateB -> stateB1 stateB2');
  sm.add('stateB1 -> stateB11 stateB12');
  sm.add('stateB11 -> stateB11X stateB11Y');
  sm.add('stateB11X -> stateB11XX stateB11XY');

  sm.when({
    'stateB': { 
      action: function() { 
        ok('here!', 'stateB.action');
      }
    },
    'stateB1': { 
      action: function() { 
        ok('here!', 'stateB1.action');
        return false; // should stop bubble
      }
    },
    'stateB11X': { 
      action: function() { 
        ok('here!', 'stateB11X.action'); 
        return true; // should bubble
      }
    },
    'stateB11XX': { 
      action: function() { 
        ok('here!', 'stateB11XX.action'); 
        return null; // should bubble
      }
    }
  });

  sm.go('stateB11XX');
  sm.act('action');
});

test("StateManager action()", function() {
  expect(3);
  var sm = Seeds.StateManager.create('A B C');
  sm
    .when('A', {
      action1: function() {
        strictEqual(arguments.length, 3, 'arguments ok');
      },
      action2: function() {}
    })
    .when('root', {
      action1: function() { strictEqual(arguments.length, 3, 'arguments ok in root'); }
    })
    .go('A');

  var f1 = sm.action('action1');
  var f2 = sm.action('action1');
  strictEqual(f1, f2, 'don\'t duplicate references to same action name');
  f1(1,2,3);
});

test("StateManager 'private methods' for state", function() {
  expect(2);
  var sm = Seeds.StateManager.create();
  sm.add('A B C').when('A', {
    anotherMethod: function() {
      strictEqual(arguments.length, 3, 'anotherMethod');
    },
    publicAction: function() {
      this.context.anotherMethod(1,2,3);
      this.act('anotherMethod', 1,2,3);
    }
  })
  .go('A')
  .act('publicAction');
});

test("StateManager.act() references other methods from ancestor states", function() {
  expect(2);
  var sm = Seeds.StateManager.create();
  sm
  .add(['A B C', 'A -> A1 A2', 'A1 -> A11 A12'])
  .when('A', {
    anotherMethod: function() {
      strictEqual(arguments.length, 3, 'A.anotherMethod');
    }
  })
  .when('A1', {
    anotherMethod: function() {
      strictEqual(arguments.length, 3, 'A1.anotherMethod');
    }
  })
  .when('A11', {
    publicMethod: function() {
      this.act('anotherMethod', 1,2,3);
    }
  })
  .go('A11')
  .act('publicMethod');
});

test("StateManager.context on state transitions", function() {
  expect(4);
  var sm = Seeds.StateManager.create('A B C');
  sm.add(['A -> A1 A2 A3', 'B -> B1 B2 B3', 'C->C1 C2 C3']);
  sm.add(['A1 -> A11 A12 A13']);
  sm.when({
    'A': { _contextFlag: 'A' },
    'A1': { _contextFlag: 'A1' },
    'A11': { _contextFlag: 'A11', 
      enter: function() { strictEqual(this.context._contextFlag, 'A11', 'context is A11'); }, 
      exit: function() { strictEqual(this.context._contextFlag, 'A11', 'context is A11'); }, 
      stay: function() { strictEqual(this.context._contextFlag, 'A11', 'context is A11'); } 
    }
  });
  sm.go('A11');
  sm.go('A');
  strictEqual(sm.context._contextFlag, 'A', 'context is A');
});

test("StateManager.stay()", function() {
  expect(3);
  var sm = Seeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> state11 state12',
    'state2 -> state21 state22',
    'state11 -> state111 state 112'
  ]);

  sm.when('state1', {
    stay: function() {
      ok('here!', 'state1.stay()');
    }
  });

  sm.go('state1');

  // go to destination via descendant state
  sm.go('state2').go('state111').go('state1');
  
  // go to destination via ancestor state
  sm.go('root').go('state1');
});

test("StateManager.stay() to define default substate", function() {
  expect(2);
  var sm = Seeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> state11 state12',
    'state2 -> state21 state22',
    'state11 -> state111 state112'
  ]);
  sm.when('state1', {
    stay: function() { this.go('state111'); }
  });

  sm.when('state11', {
    stay: function() {
      ok('here!', 'state11.stay()');
    }
  });
  sm.when('state111', {
    stay: function() {
      ok('here!', 'state111.stay()');
    }
  });

  sm.go('state1');
  strictEqual(sm.current, 'state111', 'transitioned to state111');
  sm.go('root');
});

test("StateManager: defaultSubstate", function() {
  expect(1);
  var sm = Seeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> !state11 state12',
    'state2 -> state21 state22',
    'state11 -> !state111 state112'
  ]);

  sm.go('state1');
  strictEqual(sm.current, 'state111', 'transitioned to state111');
});

test("StateManager: overwrite defaultSubstate", function() {
  expect(1);
  var sm = Seeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> !state11',
    'state1 -> !state12',
    'state12 -> !state121 state122',
    'state11 -> !state111 state112'
  ]);

  sm.go('state1');
  strictEqual(sm.current, 'state121', 'transitioned to state121');
});

test("StateManager: defaultSubstate for root", function() {
  expect(1);
  var sm = Seeds.StateManager.create();
  sm.add('state1 !state2');
  sm.go('state1').go('root');

  strictEqual(sm.current, 'state2', 'transitioned to state2');
});

test("StateManager.when(<string>, <function>)", function() {
  expect(1);
  var sm = Seeds.StateManager.create('state1 state2 state3');
  sm.add('state1 -> state11 state12 state13');
  sm.add('state11 -> state111 state112 state113');
  
  sm.when('state11', function() {
    ok('here!', 'im in state11');
  });
  sm.go('state111');
  sm.go('state1');
  sm.go('state11');
});

test("StateManager.when(<string>,<string>,<function>)", function() {
  var sm = Seeds.SM.create('A B C');
  var arr = [];
  sm
    .when('A', 'enter', function() {
      arr.push('A.enter');
    })
    .when('A', 'exit', function() {
      arr.push('A.exit');
    })
    .when('B', 'stay', function() {
      arr.push('B.stay');
    })
    .go('A')
    .go('B')
  strictEqual(arr[0], 'A.enter');
  strictEqual(arr[1], 'A.exit');
  strictEqual(arr[2], 'B.stay');
});

test("StateManager delegate", function() {
  var callbacks = [];
  var expected = ['enterA','enterA1','enterA12','stayA12','exitA12','exitA1','exitA','enterB','stayB','actdoB','actdoroot'];
  expect(expected.length);
  var sm = Seeds.SM.create()
    .sub('enter', function(state) {
      callbacks.push('enter' + state);
    })
    .sub('exit', function(state) {
      callbacks.push('exit' + state);
    })
    .sub('stay', function(state) {
      callbacks.push('stay' + state);
    })
    .sub('act', function(action, state) {
      callbacks.push('act' + action + state);
    })
    .add('A B C', 'A -> A1 A2', 'A1 -> A11 A12 A13')
    .when('root', {
      do: function() {}
    })
    .when('B', {
      do: function() {}
    })
    .go('A12')
    .go('B')
    .act('do');

  for (var i = 0; i < expected.length; i++) {
    strictEqual(callbacks[i], expected[i]);
  }


});

/* ------------------------------------------------------------------------ */
module('Seeds.PubSub');

test('PubSub basic use case', function() {
	expect(2);
	var ps = Seeds.PubSub.create();
	ps.sub('topic', function() {
		ok('here!', 'single subscriber');
	});
	ps.pub('topic');
	var count = 0;
	ps.sub('topic2', function() { count++; });
	ps.sub('topic2', function() { count++; });
	ps.sub('topic2', function() { count++; });
	ps.sub('topic3', function() { count++; });
	ps.pub('topic2');
	strictEqual(count, 3, 'multiple subscribers');
});

test('PubSub.once()', function() {
  expect(7);
  var ps = Seeds.PubSub.create(), ran = 0;
  ps.sub('topic', function() {
    ok('here!', 'im a recurring subscriber');
  })
  .once('topic', function() {
    ok('here!', 'im a one-time subscriber');
  })
  .once('topic', function() {
    ok('here!', 'im a two-time subscriber');
    if (++ran < 2) return false;
  })
  .pub('topic')
  .pub('topic')
  .pub('topic')
  .pub('topic');
});

test('PubSub.sub() to multiple events, .once() to multiple events', function() {
  expect(9);
  var ps = Seeds.PubSub.create();
  ps.sub('topic1 topic2 topic3', function() {
    ok('here!', 'im a subscriber');
  });
  ps.once('topic1 topic2 topic3', function() {
    ok('here!', 'im a subscriber');
  });
  ps.pub('topic1').pub('topic2').pub('topic3');
  ps.pub('topic1').pub('topic2').pub('topic3');
});

test('PubSub.unsub()', function() {
  expect(2);
  var ps = Seeds.PubSub.create();
  var f = function() {
    ok('here!', 'subscriber executed');
  };
  ps.sub('event1 event2', f);
  ps.pub('event1');
  ps.unsub('event2', f);
  ps.pub('event1');
  ps.unsub('event1', f);
  ps.pub('event1');
});

test('PubSub: namespaced events', function() {
  expect(2);
  var ps = Seeds.PubSub.create();
  ps.sub('namespace:topic1', function() {
    ok('here!', 'subscriber to topic1 in namespace');
  });
  ps.sub('namespace:topic2', function() {
    ok('here!', 'subscriber to topic2 in namespace');
  });
  ps.sub('namespace', function() {
    ok('here!', 'subscriber to entire namespace');
  });
  ps.sub('namespace2:topic1', function() {
    ok('here!', 'subscriber to topic1 in different namespace');
  });
  ps.pub('namespace:topic1');
});

test('PubSub: nested namespaces', function() {
  expect(3);
  var ps = Seeds.PubSub.create();
  ps.sub('parent:child:event', function() {
    ok('here!', 'subscribed to specific event');
  });
  ps.sub('parent:child', function() {
    ok('here!', 'subscribed to sub-namespace');
  });
  ps.sub('parent', function() {
    ok('here!', 'subscribed to entire namespace');
  });
  ps.sub('child:event', function() {
    ok('here!', 'subscribed to invalid namespace portion');
  });
  ps.pub('parent:child:event');
});

test('PubSub.recoup()', function() {
  expect(4);
  var ps = Seeds.PubSub.create();
  ps.pub('event1', 1, 2, 3);
  ps.pub('event2', 1, 2, 3);
  ps.recoup('event1', function() {
    strictEqual(arguments.length, 3, 'correct args');
  });
  ps.recoup('event1', function() {
    strictEqual(arguments.length, 3, 'correct args');
  });
  ps.pub('event1', 3,4,5);
});

test("PubSub.schedule() sync behavior", function() {
  expect(1);
  var ps = Seeds.PubSub.create();
  ps.sub('event', function() {
    strictEqual(arguments.length, 3, 'correct number of arguments');
  });
  ps.schedule('event', 1, 2, 3).now();
});

/* ------------------------------------------------------------------------ */
module('Seeds.Scheduler');

test('Scheduler sync behavior', function() {
  expect(2);
  var schedule = Seeds.Scheduler.create(function() {
    ok('here', 'callback executed!');
    strictEqual(arguments.length, 3, 'correct arguments');
    // strictEqual(this, self, 'correct thisArg');
  });
  schedule.now(1,2,3);
});

/* ------------------------------------------------------------------------ */
module('Seeds.Permit');

test('Permit basic setup', function() {
  expect(2);
  var permit = Seeds.Permit.create();
  var myapp = {
    doSomething: permit.allow('admin', function() {
      ok('here!', 'entered method');
      strictEqual(arguments.length, 3, 'all arguments received');
    })
  };
  permit.evaluator(function(expr) {
    return expr === 'admin';
  });
  myapp.doSomething('a','b', 'c');
  permit.evaluator(function(expr) {
    return expr === 'user';
  });
  myapp.doSomething('a','b', 'c');
});

test("Permit: self-delegation", function() {
  expect(2);
  var permit = Seeds.Permit.create();
  permit.sub('allow', function() {
    ok('here!', 'did allow');
  })
  .sub('disallow', function() {
    ok('here!', 'did disallow');
  });
  
  var myapp = {
    doSomething: permit.allow('admin', function() {})
  };
  permit.evaluator(function(expr) {
    return expr === 'admin';
  });
  myapp.doSomething();
  permit.evaluator(function(expr) {
    return expr === 'user';
  });
  myapp.doSomething();
});

test("Permit: evaluator as string", function() {
  expect(1);
  var permit = Seeds.Permit.create();
  permit.evaluator('admin');
  var f = permit.allow('admin', function() {
    strictEqual(arguments.length, 3, 'arguments ok');
  });
  f(1,2,3);
  permit.evaluator('user');
  f(1,2,3);
});

test("Permit: evaluator as regex", function() {
  expect(2);
  var permit = Seeds.Permit.create();
  permit.evaluator(/^\s+/);
  var f1 = permit.allow('   s', function() { ok('here'); });
  var f2 = permit.allow(' s', function() { ok('here'); });
  var f3 = permit.allow('s', function() { ok('here'); });
  f1();f2();f3();
});

/* ------------------------------------------------------------------------ */
module('StateManager ASYNC');
asyncTest('StateManager: ASYNC behavior', function() {
  expect(1);
  var sm = Seeds.SM.create('A B C');
  sm.add('A -> !A1 A2 A3', 'B -> B1 B2 B3', 'C -> C1 C2 C3');
  sm.add('A1 -> !A11 A12 A13', 'B1 -> B11 B12 B13', 'C1 -> C11 C12 C13');

  sm.when({
    'A': {
      enter: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      }
    },
    'A1': {},
    'A11': {
      stay: function() {
        ok('here','got in A11');
      }
    }
  });

  sm.go('A');
  window.setTimeout(function() {
    start();
  },200);
});

asyncTest('StateManager: daisy-chained ASYNC behavior', function() {
  expect(1);
  var sm = Seeds.SM.create('A B C');
  sm.add('A -> A1 A2 A3', 'B -> B1 B2 B3', 'C -> C1 C2 C3');
  sm.add('A1 -> A11 A12 A13', 'B1 -> B11 B12 B13', 'C1 -> C11 C12 C13');

  sm.when({
    'A': {
      enter: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      }
    },
    'A1': {
      enter: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      }
    },
    'A11': {
      enter: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      },
      stay: function() {
        ok('here','got in A11');
      }
    },
    'B': {
      exit: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      }
    },
    'B1': {
      exit: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      }
    },
    'B11': {
      exit: function() {
        window.setTimeout(function() {
          sm.resume();
        }, 50);
        return false;
      }
    }
  });

  sm.go('B11').go('A11');
  window.setTimeout(function() {
    start();
  },500);
});

/* ------------------------------------------------------------------------ */
module("Scheduler ASYNC");
asyncTest('Scheduler async: delay + reset', function() {
  expect(1);
  var schedule = Seeds.Scheduler.create(function() {
    ok('here', 'callback executed!');
  });
  schedule.delay(200);
  var i = 0;
  var interval = window.setInterval(function() {
    if (i++ < 10) schedule.reset();
  }, 100);
  
  window.setTimeout(function() {
    window.clearInterval(interval);
    start();
  }, 1300);
});

asyncTest('Scheduler async: repeat + reset', function() {
  expect(5);
  var schedule = Seeds.Scheduler.create(function() {
    ok('here', 'callback executed!');
  });
  schedule.repeat(100);
  var i = 0;
  var interval = window.setInterval(function() {
    if (i++ < 6) schedule.reset();
  }, 50);
  window.setTimeout(function() {
    schedule.stop();
  }, 890);
  
  window.setTimeout(function() {
    window.clearInterval(interval);
    start();
  }, 2000);
});

asyncTest('Scheduler.throttle()', function() {
  expect(3);
  var task = Seeds.Scheduler.create(function() {
    ok('here', 'callback executed');
  }).throttle(1000);
  var interval = window.setInterval(function() {
    task.now();
  }, 50);

  window.setTimeout(function() {
    window.clearInterval(interval);
    start();
  }, 3200);
});