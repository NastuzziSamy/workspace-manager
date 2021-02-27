var SignalMixin = {
    signals: [],

    connectSignal(element, signal, callback) {
        this.signals.push([element, element.connect(signal, callback)]);
    },

    disconnectSignals() {
        for (const key in this.signals) {
            const [element, signal] = this.signals[key];

            element.disconnect(signal);
        }

        this.signals = [];
    },
};


var ProxyMixin = {
    proxies: [],

    applyProxy(element, method, callback) {
        const proxied = element[method].bind(element);
        const proxy = (...args) => {
            return callback(proxied, ...args);
        };

        this.proxies.push([element, method, element[method], proxy]);

        element[method] = proxy;
    },

    restoreProxies() {
        for (const key in this.proxies) {
            const [element, method, callback, proxy] = this.proxies[key];

            if (element[method] === proxy) {
                element[method] = callback;
            }
        }
     
        this.proxies = [];
    }
};