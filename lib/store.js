import { BehaviorSubject } from 'rx';
import { get, set, has, wrap } from 'lodash';

function passThroughFilter(subscriber, value) {
  return value;
}

function observe(observable, subscriber, onValue, filter) {
  return observable.subscribe(newValue => {
    onValue(subscriber, filter(subscriber, newValue));
  });
}

function behaviorSubjectFactory(key, defaultValue) {
  return new BehaviorSubject(defaultValue);
}

function valueGetSet(prop, store, setToValue) {
  if (setToValue) {
    set(store, prop, setToValue);
  }
  return get(store, prop);
}

const
  observableFactory = wrap('_factory', valueGetSet),
  observables = wrap('_observables', valueGetSet),
  subscriptions = wrap('_subscriptions', valueGetSet);

class Store {

  /*
    Create a new store

    @param {function} [factory] - function called to create new observables on initialize.
      Defaults to:
      <pre>
        <code>
          function behaviorSubjectFactory(key, defaultValue){
            return new Rx.BehaviorSubject(defaultValue)
          }
        </code>
      </pre>
  */
  constructor(factory = behaviorSubjectFactory) {
    observableFactory(this, factory);
    observables(this, {});
    subscriptions(this, {});
  }

  /*
    Initialize a new observable stream

    @param {(string|string[])} key - a keypath uniquely identifying the observable
    @param {*} defaultValue - the value used as default value for the observable
  */
  initialize(key, defaultValue) {
    if (has(observables(this), key)) {
      throw new Error(`Observable at ${key} is already initialized.`);
    }

    set(observables(this), key, observableFactory(this)(key, defaultValue));
  }

  /*
    Return true if an observable at keypath exists

    @param {(string|string[])} key - a keypath uniquely identifying the observable
  */
  isInitialized(key) {
    return has(observables(this), key);
  }

  /*
    Return true if an observable at keypath exists

    The subscriber should have a static (prototype level) property subscriptions of form:
    <pre>
      <code>
        [
          {
            observableKey: '<keypath used to initialize observable>',
            onValue: function(subscriber, value){
              //called with the registered subsriber and the new (filtered) value received through observable.onNext
            },
            filter: function(subscriber, receivedValue){
              // OPTIONAL, default behavior will pass through the unfiltered value received from observable.onNext unchanged

              // do something with the receivedValue
              return newValueToBePassedToOnValue;
            }
          },
          ...
        ]
      </code>
    </pre>

    For example
    <pre>
      <code>
        class MyComponent {
          ...
        }

        MyComponent.subscriptions = [
          {
            observableKey: 'myObservable',
            onValue: function(myComponent, value){
              myComponent.setState({ value });
            },
            filter: function(myComponent, values){
              return values.filter(v => v.id === myComponent.props.currentValueId)[0];
            }
          }
        ];
      </code>
    </pre>

    @param {*} subscriber - the unique object/React component etc. used as the subscriber.
  */
  subscribe(subscriber) {
    if (subscriptions(this)[subscriber]) {
      this.unsubscribe(subscriber);
    }

    subscriptions(this)[subscriber] = [];

    subscriber.constructor.subscriptions.forEach(config => {
      const { filter, onValue, observableKey } = config;

      subscriptions(this)[subscriber].push(observe(
        observables(this)[observableKey],
        subscriber,
        onValue,
        filter || passThroughFilter
      ));
    });
  }

  /*
    Remove all subscriptions attached to the subscriber

    @param {*} subscriber - the unique object/React component etc. used as the subscriber.
  */
  unsubscribe(subscriber) {
    subscriptions(this)[subscriber].forEach(subscription => {
      subscription.dispose();
    });
    delete subscriptions(this)[subscriber];
  }

  /*
    Publish a new value to the observable at keypath

    @param {(string|string[])} key - a keypath uniquely identifying the observable
    @param {*} nextValue - the new value to be sent to all subscribers and recorded as the new current value
  */
  publish(key, nextValue) {
    get(observables(this), key).onNext(nextValue);
  }
}

// Export global instance
export default Store;
