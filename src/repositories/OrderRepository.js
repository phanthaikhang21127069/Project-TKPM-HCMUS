const Order = require("../models/order.model");

class OrderRepository {
  async findOrdersByAccountId(accountId, status) {
    return Order.find({ idAccount: accountId, status })
      .populate("idAccount")
      .populate("detail.idProduct")
      .populate("idSeller")
      .sort({ date: -1 });
  }
}

module.exports = new OrderRepository();
