const Account = require("../models/account.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Evaluate = require("../models/evaluate.model");
const AccountRepository = require('../repositories/AccountRepository');
const OrderRepository = require('../repositories/OrderRepository');
const fs = require("fs");
const path = require("path");
const passport = require("passport");
const { sendForgotPasswordMail } = require("../utils/mail");
const bcrypt = require("bcrypt");
const {
  mutipleMongooseToObject,
  mongooseToObject,
} = require("../utils/mongoose");
const mongoose = require("../utils/mongoose");
class acccountController {
  // [GET] account/sign-up
  getSignUp = async (req, res, next) => {
    try {
      res.render("sign-up", {
        registerMessage: req.flash("registerMessage"),
        reqUrl: req.query.reqUrl,
      });
    } catch (err) {
      next(err);
    }
  };

  // [POST] account/sign-up
  signUp = async (req, res, next) => {
    passport.authenticate("local-register", (error, user) => {
      if (error) {
        return next(error);
      }
      // Đăng kí không thành công, load lại trang đăng kí
      if (!user) {
        console.log("Đăng kí không thành công");
        return res.redirect(`/account/sign-up`);
      } else {
        // Đăng kí thành công
        res.redirect("/account/sign-in?success=true");
      }
    })(req, res, next);
  };

  // [GET] account/sign-in
  getSignIn = async (req, res, next) => {
    try {
      if (req.isAuthenticated()) {
        return res.redirect("/account/my-profile");
      }

      if (req.query?.success == "true") {
        res.locals.registerMessage =
          "You have registered successfully. Please login!";
        console.log("OK");
      } else if (req.url.includes("?")) {
        res.locals._loginFirst = "You haven't logged in. Please login first!";
      }
      res.render("sign-in", {
        loginMessage: req.flash("loginMessage"),
        reqUrl: req.query.reqUrl,
      });
    } catch (err) {
      next(err);
    }
  };

  // [POST] account/sign-in
  signIn = async (req, res, next) => {
    let keepSignedIn = req.body.keepSignedIn;
    let cart = req.session.cart;
    let reqUrl = req.body.reqUrl ? req.body.reqUrl : "/account/my-profile";
    passport.authenticate("local-login", (error, user) => {
      if (error) {
        return next(error);
      }
      if (!user) {
        // Xác thực thất bại
        return res.redirect(`/account/sign-in?reqUrl=${reqUrl}`);
      }
      req.logIn(user, (error) => {
        if (error) {
          // Đăng nhập thất bại
          return next(error);
        }
        // Đăng nhập thành công
        // Get the account ID from the logged-in user
        const accountId = user._id; // Adjust this to match your account model field name
        req.session.cart = cart;
        // Append the account ID as a slug to the "reqUrl"
        if (reqUrl == "/account/my-profile") {
          reqUrl = `${reqUrl}/${accountId}`;
        }
        req.session.cookie.maxAge = keepSignedIn ? 24 * 60 * 60 * 1000 : null;
        return res.redirect(reqUrl);
      });
    })(req, res, next);
  };

  // Authentication and Authorization
  isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect(`/account/sign-in?reqUrl=${req.originalUrl}`);
  };

  isAdmin = (req, res, next) => {
    if (req.user.role == "Admin") {
      return next();
    }
    res.status(404).render("error", {
      message: "File not found!",
    });
  };

  isSeller = (req, res, next) => {
    if (req.user.role == "Seller" || req.user.role == "Admin") {
      return next();
    }
    res.status(404).render("error", {
      message: "File not found!",
    });
  };

  // [GET] account/sign-out
  signOut = async (req, res, next) => {
    let cart = req.session.cart;
    req.logout((error) => {
      if (error) {
        return next(error);
      }
      req.session.cart = cart;
      res.redirect("/");
    });
  };

  // [GET] account/forgot
  showForgotPassword = (req, res, next) => {
    res.render("forgot-password");
  };

  // [POST] acccount/forgot
  async forgotPassword(req, res, next) {
    let email = req.body.email;
    try {
      let user = await AccountRepository.findOne({ email: email });
      if (user) {
        const newPassword = require('../utils/function-helpers').generateRandomStr(8);
        const hashedPassword = await AccountRepository.hashPassword(newPassword);
        await AccountRepository.updateOne(user._id, { password: hashedPassword });

        const host = req.header('host');
        sendForgotPasswordMail(user, host, newPassword)
          .then(() => {
            console.log("Email has been sent");
            res.render("forgot-password", { done: true });
          })
          .catch((error) => {
            res.render("forgot-password", {
              message: "An error occurred when sending the email. Please check your email address!",
            });
          });
      } else {
        res.render("forgot-password", {
          message: "Email does not exist!",
        });
      }
    } catch (err) {
      next(err);
    }
  }

  // [GET] account/page/:id
  getAccountPage = async (req, res, next) => {
    try {
      const account = await Account.findById(req.params.id);
      if (account.role == "Seller") {
        res.locals._isSeller = true;
        let page = isNaN(req.query.page)
          ? 1
          : Math.max(1, parseInt(req.query.page));
        const limit = 8;
        const productAll = await Product.find({
          idAccount: account._id,
          $or: [{ status: "Available" }, { status: "Reported" }],
        });
        const products = await Product.find({
          idAccount: account._id,
          $or: [{ status: "Available" }, { status: "Reported" }],
        })
          .skip((page - 1) * limit)
          .limit(limit);
        let options = [];
        let numOfProduct = 0;
        let evaluates;
        let numOfRating = 0;
        let sumRating = 0;
        for (let i = 0; i < productAll.length; i++) {
          options.push({ idProduct: productAll[i]._id });
          numOfProduct += productAll[i].stock;
        }
        if (productAll.length > 0) {
          if (options.length != 0) {
            evaluates = await Evaluate.find({
              $or: options,
            });
          }
          for (let i = 0; i < evaluates.length; i++) {
            sumRating += evaluates[i].rating;
            if (evaluates[i].rating > 0) {
              numOfRating += 1;
            }
          }
          res.locals.products = mutipleMongooseToObject(products);
          res.locals._numberOfReview = evaluates.length;
          res.locals._numberOfProduct = numOfProduct;
          res.locals._avgOfRating = (sumRating / numOfRating).toFixed(1);
          res.locals._numberOfItems = productAll.length;
          res.locals._limit = limit;
          res.locals._currentPage = page;
        } else {
          res.locals._numberOfProduct = 0;
          res.locals._numberOfReview = 0;
          res.locals._avgOfRating = 0;
        }
      } else {
        const orders = await Order.find({
          idAccount: req.params.id,
          status: "successful",
        });
        let totalPay = 0;
        for (const order of orders) {
          for (const product of order.detail) {
            const productInfo = await Product.findById(product.idProduct);
            totalPay += product.quantity * productInfo.price;
          }
        }
        let totalSucOrder = await Order.find({
          idAccount: req.params.id,
          status: "successful",
        }).countDocuments();
        res.locals._totalOrder = orders.length;
        res.locals._totalSucOrder = totalSucOrder;
        res.locals._totalPay = totalPay;
      }
      res.render("shop-info", {
        account: mongooseToObject(account),
        convertMoney: (str) => {
          return Number(str).toLocaleString("it-IT", {
            style: "currency",
            currency: "VND",
          });
        },
      });
    } catch (err) {
      next(err);
    }
  };

  reportUser = async (req, res, next) => {
    try {
      const accountId = req.params.idUser;
      const user = await Account.findById(accountId);
      user.accountStatus = "Reported";
      await user.save();

      res.redirect(`/account/page/${req.params.idUser}`);
    } catch (err) {
      next(err);
    }
  };

  async getMyProfile(req, res, next) {
    try {
      const user = await AccountRepository.findById(req.params._id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.locals.user = mongooseToObject(user);
      if (user.role === "Admin") {
        res.locals.switchRole = "Admin";
        res.locals.switchLink = "announcement";
      } else if (user.role === "Buyer") {
        res.locals.switchRole = "Become seller";
        res.locals.switchLink = "account/become-seller/" + user._id;
      } else {
        res.locals.switchRole = "Sale management";
        res.locals.switchLink = "product/dashboard";
      }
      res.render("profile_updating");
    } catch (err) {
      next(err);
    }
  }
  
  async updateMyProfile(req, res, next) {
    const accountId = req.params._id;
    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address,
      email: req.body.email,
      phone: req.body.phone,
      job: req.body.job,
      avatar: req.body.avatarPath
    };

    try {
      const user = await AccountRepository.updateAccountDetails(accountId, updates);

      // Check the present password
      const isPasswordValid = await AccountRepository.checkPassword(req.body.presentPassword, user.password);
      if (!isPasswordValid) {
        req.flash("changePasswordMessage", "Incorrect present password.");
        return res.redirect(`/account/my-profile/${accountId}`);
      }

      // Change password if new password is provided
      if (req.body.newPassword) {
        await AccountRepository.changePassword(accountId, req.body.newPassword);
      }

      req.flash("changePasswordMessage", "Profile and password updated successfully.");
      res.redirect(`/account/my-profile/${accountId}`);
    } catch (err) {
      if (err.message === 'User not found') {
        return res.status(404).send("User not found");
      }
      next(err);
    }
  }

  getMyOrder = async (req, res, next) => {
    try {
      const accountId = req.params._id;
      const user = await AccountRepository.findById(accountId);
  
      if (!user) {
        return res.status(404).send("User not found");
      }
  
      const orders = await OrderRepository.findOrdersByAccountId(accountId, "successful");
      const orderObject = mutipleMongooseToObject(orders);
  
      // res.locals.user = user;
      res.locals.user = mongooseToObject(user);
      this.setRoleSwitchLinks(user, res.locals);
  
      res.locals.orders = orderObject;
      res.render("my_order");
    } catch (err) {
      next(err);
    }
  }
  

  setRoleSwitchLinks(user, locals) {
    if (user.role === "Admin") {
      locals.switchRole = "Admin";
      locals.switchLink = "announcement";
    } else if (user.role === "Buyer") {
      locals.switchRole = "Become seller";
      locals.switchLink = "account/become-seller/" + user._id;
    } else {
      locals.switchRole = "Sale management";
      locals.switchLink = "product/dashboard";
    }
  }

  getMyOrderPending = async (req, res, next) => {
    try {
        const accountId = req.params._id;
        const user = await AccountRepository.findById(accountId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const orders = await OrderRepository.findOrdersByAccountId(accountId, "pending");
        const orderObject = mutipleMongooseToObject(orders);

        const products = [];
        for (const order of orderObject) {
            for (const detail of order.detail) {
                const detailWithOrder = { ...detail, idOrder: order._id };
                products.push(detailWithOrder);
            }
        }

        res.locals.user = mongooseToObject(user);
        res.locals.orders = orderObject;
        res.locals.products = products;
        this.setRoleSwitchLinks(user, res.locals);

        res.render("my_order-pending");
    } catch (err) {
        next(err);
    }
}

  getMyOrderCancelled = async (req, res, next) => {
    try {
        const accountId = req.params._id;
        const user = await AccountRepository.findById(accountId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        const orders = await OrderRepository.findOrdersByAccountId(accountId, "cancelled");
        const orderObject = mutipleMongooseToObject(orders);

        const products = [];
        for (const order of orderObject) {
            for (const detail of order.detail) {
                const detailWithOrder = { ...detail, idOrder: order._id };
                products.push(detailWithOrder);
            }
        }

        res.locals.user = mongooseToObject(user);
        res.locals.orders = orderObject;
        res.locals.products = products;
        this.setRoleSwitchLinks(user, res.locals);

        res.render("my_order-cancelled");
    } catch (err) {
        next(err);
    }
}

  async getBecomeSeller(req, res, next) {
    try {
      const accountId = req.params._id;
      const user = await AccountRepository.findById(accountId);

      if (!user) {
        return res.status(404).send("User not found");
      }

      // res.locals.user = user;
      res.locals.user = mongooseToObject(user);
      res.locals.switchRole = "Become seller";
      res.locals.switchLink = "account/become-seller/" + accountId;

      if (user.accountStatus === "Pending") {
        res.render("become_seller-pending");
      } else {
        // The request to become a seller has been sent and the account has been approved
        res.render("become_seller");
      }
    } catch (err) {
      next(err);
    }
  }

  async registerSeller(req, res, next) {
    const accountId = req.params._id;
    const updates = {
      shopName: req.body.shopName,
      address: req.body.address,
      job: req.body.job
    };

    try {
      await AccountRepository.updateSellerStatus(accountId, updates);
      res.redirect(`/account/become-seller/${accountId}`);
    } catch (err) {
      if (err.message === 'User not found') {
        res.status(404).send("User not found");
      } else {
        next(err);
      }
    }
  }

  // [GET] account/all
  async getAllAccount(req, res, next) {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const { accounts, count } = await AccountRepository.findAllWithPagination(page, limit);

      res.locals._numberOfItems = count;
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.render("admin_account_all", {
        accounts: mutipleMongooseToObject(accounts),
        numOfAccounts: accounts.length,
      });
    } catch (err) {
      next(err);
    }
  }

  // [GET] account/pending
  async getPendingAccount(req, res, next) {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const { accounts, count } = await AccountRepository.findWithPaginationAndStatus("Pending", page, limit);

      res.locals._numberOfItems = count;
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.render("admin_account_pending", {
        accounts: mutipleMongooseToObject(accounts),
        numOfAccounts: accounts.length,
      });
    } catch (err) {
      next(err);
    }
  }

  // [GET] account/reported
  async getReportedAccount(req, res, next) {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const { accounts, count } = await AccountRepository.findWithPaginationAndStatus("Reported", page, limit);

      res.locals._numberOfItems = count;
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.render("admin_account_reported", {
        accounts: mutipleMongooseToObject(accounts),
        numOfAccounts: accounts.length,
      });
    } catch (err) {
      next(err);
    }
  }

  // [GET] account/banned
  async getBannedAccount(req, res, next) {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const { accounts, count } = await AccountRepository.findWithPaginationAndStatus("Banned", page, limit);

      res.locals._numberOfItems = count;
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.render("admin_account_banned", {
        accounts: mutipleMongooseToObject(accounts),
        numOfAccounts: accounts.length,
      });
    } catch (err) {
      next(err);
    }
  }

  // [POST] account/exec-account
  async executeAccount(req, res, next) {
    const accountId = req.query.id;
    const type = req.query.type;

    try {
      await AccountRepository.executeAccountAction(accountId, type);
      res.redirect("back");
    } catch (err) {
      if (err.message === 'User not found') {
        res.status(404).send("User not found");
      } else {
        next(err);
      }
    }
  }
}

module.exports = new acccountController();
