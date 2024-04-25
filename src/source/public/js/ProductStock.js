class ProductStock {
    constructor() {
        this.products = new Map();  // holds stock levels for products
    }

    updateStock(productId, newStock) {
        this.products.set(productId, newStock);
        this.notify(productId, newStock);
    }

    subscribe(productId, observerFunction) {
        this.observers[productId] = this.observers[productId] || [];
        this.observers[productId].push(observerFunction);
    }

    notify(productId, stock) {
        if (this.observers[productId]) {
            this.observers[productId].forEach(observer => observer(stock));
        }
    }
}

module.exports = ProductStock;