import React from "react";
import PropTypes from "prop-types";
import warning from "warning";

// TODO: Swap this out for Symbol once we don't need a shim for it.
let uid = 1;

function createContext(defaultValue) {
  const channel = uid++;

  /**
   * A <Provider> is a container for a "value" that its <Consumer>
   * may subscribe to.
   */
  class Provider extends React.Component {
    /**
     * For convenience when setting up a component that tracks this
     * <Provider>'s value in state.
     *
     *   const { Provider, Consumer } = createContext("default value")
     *
     *   class MyComponent {
     *     state = {
     *       value: Provider.defaultValue
     *     }
     *
     *     // ...
     *
     *     render() {
     *       return <Provider value={this.state.value}/>
     *     }
     *   }
     */
    static defaultValue = defaultValue;

    static propTypes = {
      children: PropTypes.node,
      value: PropTypes.any
    };

    static defaultProps = {
      value: defaultValue
    };

    static contextTypes = {
      broadcasts: PropTypes.object
    };

    static childContextTypes = {
      broadcasts: PropTypes.object.isRequired
    };

    subscribers = [];

    publish = value => {
      this.subscribers.forEach(s => s(value));
    };

    subscribe = subscriber => {
      this.subscribers.push(subscriber);

      return () => {
        this.subscribers = this.subscribers.filter(s => s !== subscriber);
      };
    };

    getValue = () => {
      return this.props.value;
    };

    getChildContext() {
      return {
        broadcasts: {
          ...this.context.broadcasts,
          [channel]: {
            subscribe: this.subscribe,
            getValue: this.getValue
          }
        }
      };
    }

    componentWillReceiveProps(nextProps) {
      if (this.props.value !== nextProps.value) {
        this.publish(nextProps.value);
      }
    }

    render() {
      return this.props.children;
    }
  }

  /**
   * A <Consumer> sets state whenever its <Provider value> changes
   * and calls its render prop with the result.
   */
  class Consumer extends React.Component {
    static contextTypes = {
      broadcasts: PropTypes.object
    };

    static propTypes = {
      children: PropTypes.func,
      quiet: PropTypes.bool
    };

    static defaultProps = {
      quiet: false
    };

    broadcast = this.context.broadcasts && this.context.broadcasts[channel];

    state = {
      value: this.broadcast ? this.broadcast.getValue() : defaultValue
    };

    componentDidMount() {
      if (this.broadcast) {
        this.unsubscribe = this.broadcast.subscribe(value => {
          this.setState({ value });
        });
      } else {
        warning(
          this.props.quiet,
          "<Consumer> was rendered outside the context of its <Provider>"
        );
      }
    }

    componentWillUnmount() {
      if (this.unsubscribe) this.unsubscribe();
    }

    render() {
      const { children } = this.props;
      return children ? children(this.state.value) : null;
    }
  }

  return {
    Provider,
    Consumer
  };
}

export default createContext;
