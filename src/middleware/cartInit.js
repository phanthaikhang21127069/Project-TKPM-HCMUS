// This middleware aims to synchronize the cart items in the session 
// with the user's cart stored in the database whenever a user is logged in

const Account = require("../models/account.model");
const Product = require("../models/product.model");
const { mongooseToObject } = require("../utils/mongoose");

// async function initCart(req, res, next) {
//   try {
//     // Check if user is logged in to synchronize the cart items
//     if (req.user) {
//       // Deep copy the carts
//       const reqUserCart = JSON.parse(JSON.stringify(req.user.cart));
//       const reqSessionCart = JSON.parse(JSON.stringify(req.session.cart));

//       // Synchronize from user's cart to session cart
//       for (const eleUser of reqUserCart) {
//         let isFound = false;
//         for (const eleSess of reqSessionCart) {
//           if (eleUser._id == eleSess._id) {
//             if (eleUser.quantity != eleSess.quantity) {
//               const maxQuantity = Math.max(eleUser.quantity, eleSess.quantity);
//               req.user.cart.find(item => item._id === eleUser._id).quantity = maxQuantity;
//               req.session.cart.find(item => item._id === eleSess._id).quantity = maxQuantity;
//             }
//             isFound = true;
//             break; // Stop the inner loop once a match is found
//           }
//         }
//         // If not found, add the product info from the database to the session cart
//         if (!isFound) {
//           let productInfo = await Product.findById(eleUser._id);
//           if (productInfo) {
//             productInfo = mongooseToObject(productInfo);
//             productInfo.quantity = eleUser.quantity;
//             req.session.cart.push(productInfo);
//           }
//         }
//       }

//       // Synchronize from session cart to user's cart
//       for (const eleSess of reqSessionCart) {
//         let isFound = false;
//         for (const eleUser of reqUserCart) {
//           if (eleUser._id == eleSess._id) {
//             isFound = true;
//             break; // Stop the inner loop once a match is found
//           }
//         }
//         if (!isFound) {
//           req.user.cart.push({
//             _id: eleSess._id,
//             quantity: eleSess.quantity
//           });
//         }
//       }

//       // Save the updated user cart to the database
//       await Account.findOneAndUpdate(
//         { _id: req.user._id },
//         { cart: req.user.cart }
//       );

//       // Update the local variable for displaying cart quantity in UI
//       const cart = req.session.cart;
//       res.locals._cartNumber = cart.reduce(
//         (accum, product) => accum + product.quantity,
//         0
//       );
//     }
//   } catch (err) {
//     next(err);
//   }
// }

// module.exports = initCart;

async function initCart(req, res, next) {
  try {
    // Nếu người dùng đã đăng nhập thì đồng nhất giỏ hàng ở trong session với lại giỏ hàng ở trong user sau đó update DB
    if (req.user) {
      // Tạo deep copy
      reqUserCart = JSON.parse(JSON.stringify(req.user.cart));
      reqSessionCart = JSON.parse(JSON.stringify(req.session.cart));
      reqUserCart.forEach(async (eleUser, idxUser) => {
        let isFound = false;
        reqSessionCart.forEach((eleSess, idxSess) => {
          if (eleUser._id == eleSess._id) {
            if (eleUser.quantity != eleSess.quantity) {
              let maxQuantity = Math.max(
                req.user.cart[idxUser].quantity,
                req.session.cart[idxSess].quantity
              );
              req.user.cart[idxUser].quantity = maxQuantity;
              req.session.cart[idxSess].quantity = maxQuantity;
            }
            isFound = true;
            return;
          }
        });
        if (!isFound) {
          let productInfo = await Product.findById(eleUser._id);
          productInfo = mongooseToObject(productInfo);
          productInfo.quantity = eleUser.quantity;
          req.session.cart.push(productInfo);
        }
      });

      reqSessionCart.forEach(async (eleSess, idxSess) => {
        let isFound = false;
        reqUserCart.forEach((eleUser, idxUser) => {
          if (eleUser._id == eleSess._id) {
            isFound = true;
            return;
          }
        });
        if (!isFound) {
          req.user.cart.push({
            _id: eleSess._id,
            quantity: eleSess.quantity,
          });
        }
        await Account.findOneAndUpdate(
          { _id: req.user._id },
          { cart: req.user.cart }
        );
      });
      let cart = req.session.cart;
      res.locals._cartNumber = cart.reduce(
        (accum, product) => accum + product.quantity,
        0
      );
    }
  } catch (err) {
    next(err);
  }
}
module.exports = initCart;