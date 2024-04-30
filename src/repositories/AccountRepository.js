const Account = require("../models/account.model");
const bcrypt = require("bcrypt");

class AccountRepository {
  async findById(id) {
    return Account.findById(id);
  }

  async findOne(criteria) {
    return Account.findOne(criteria);
  }

  async updateOne(id, updateData) {
    return Account.updateOne({ _id: id }, updateData);
  }

  async create(newUser) {
    return new Account(newUser).save();
  }

  async validatePassword(candidatePassword, userPassword) {
    return bcrypt.compare(candidatePassword, userPassword);
  }

  async hashPassword(password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  async updateAccountDetails(accountId, updates) {
    const user = await Account.findById(accountId);
    if (!user) {
      throw new Error('User not found');
    }

    // Apply updates
    Object.keys(updates).forEach(key => user[key] = updates[key]);
    await user.save();
    return user;
  }

  async checkPassword(candidatePassword, userPassword) {
    return bcrypt.compare(candidatePassword, userPassword);
  }

  async changePassword(userId, newPassword) {
    const hashedNewPassword = await this.hashPassword(newPassword);
    await Account.updateOne({ _id: userId }, { password: hashedNewPassword });
  }

  async updateSellerStatus(accountId, updates) {
    const user = await this.findById(accountId);
    if (!user) {
      throw new Error('User not found');
    }
    user.requestStatus = "Become-seller";
    user.accountStatus = "Pending";
    user.shopName = updates.shopName;
    user.address = updates.address;
    user.job = updates.job;
    await user.save();
    return user;
  }

  async findAllWithPagination(page, limit) {
    const accounts = await Account.find()
      .sort({ time: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const count = await Account.countDocuments();

    return { accounts, count };
  }

  async findWithPaginationAndStatus(status, page, limit) {
    const accounts = await Account.find({ accountStatus: status })
      .sort({ time: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const count = await Account.countDocuments({ accountStatus: status });

    return { accounts, count };
  }

  async executeAccountAction(accountId, actionType) {
    const user = await Account.findById(accountId);
    if (!user) {
      throw new Error('User not found');
    }

    switch (actionType) {
      case "ban":
        user.accountStatus = "Banned";
        break;
      case "unban":
        if (user.requestStatus === "Become-seller") {
          user.accountStatus = "Pending";
        } else {
          user.accountStatus = "None";
          user.requestStatus = "None";
        }
        break;
      case "accept":
        user.accountStatus = "None";
        user.requestStatus = "None";
        user.role = "Seller";
        break;
      case "deny":
        user.accountStatus = "None";
        user.requestStatus = "None";
        break;
      default:
        if (user.requestStatus === "Become-seller") {
          user.accountStatus = "Pending";
        } else {
          user.accountStatus = "None";
          user.requestStatus = "None";
        }
        break;
    }

    await user.save();
    return user;
  }
}

module.exports = new AccountRepository();
