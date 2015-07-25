import { BehaviorSubject } from 'rx';
import { get, set, has, wrap } from 'lodash';

function observe(observable, subscriber, onValue, filter) {
  return observable.subscribe(newValue => {
    onValue(subscriber, filter ? filter(subscriber, newValue) : newValue);
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

/*
  Store - a collection of observables to subscribe to with helper methods

  @class
*/
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
    Create subscriptions for the component

    @param {React.Component} subscriber
    @param {Object[]} componentSubscriptions - The components subscription configurations
    @param {string} componentSubscriptions[].observableKey - The observable to subscribe to as previously initialized
    @param {function} componentSubscriptions[].onValue - A function called with the subscriber and new (possibly filtered) value received from the observable
    @param {function} [componentSubscriptions[].filter] - A function called with the subscriber and the new value received from the observable. If set, the return value of this function will be passed to onValue unchanged.
  */
  subscribe(subscriber, componentSubscriptions) {
    if (this.hasSubscriptions(subscriber)) {
      this.unsubscribe(subscriber);
    }

    subscriptions(this)[subscriber] = [];

    componentSubscriptions.forEach(config => {
      const { filter, onValue, observableKey } = config;

      subscriptions(this)[subscriber].push(observe(
        get(observables(this), observableKey),
        subscriber,
        onValue,
        filter
      ));
    });
  }

  /*
    Remove all subscriptions attached to the subscriber

    @param {React.Component} subscriber - the subscribed component
  */
  unsubscribe(subscriber) {
    subscriptions(this)[subscriber].forEach(subscription => {
      subscription.dispose();
    });
    delete subscriptions(this)[subscriber];
  }

  /*
    Check whether or not the component has active subscriptions

    @param {React.Component} subscriber - the subscribed component
    @return {Boolean} true if has subscriptions, false otherwise
  */
  hasSubscriptions(subscriber) {
    return !!subscriptions(this)[subscriber];
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
