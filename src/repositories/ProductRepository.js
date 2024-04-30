// product.repository.js
const Product = require("../models/product.model");
const Evaluate = require("../models/evaluate.model");

class ProductRepository {
    async findProducts(options, sort, pagination) {
        const products = await Product.find(options)
            .sort(sort)
            .skip(pagination.offset)
            .limit(pagination.limit);
        return products;
    }

    async countProducts(options) {
        return await Product.find(options).countDocuments();
    }

    async aggregateCategories(statuses) {
        return await Product.aggregate([
            {
                $match: { status: { $in: statuses } },
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);
    }

    async searchProductsByKeyword(keyword, options, pagination) {
        const regex = new RegExp(keyword, 'i');
        options.name = regex;
        return await Product.find(options)
            .skip(pagination.offset)
            .limit(pagination.limit);
    }

    async countProductsByKeyword(keyword, options) {
        const regex = new RegExp(keyword, 'i');
        options.name = regex;
        return await Product.find(options).countDocuments();
    }

    async findProductById(productId) {
        return await Product.findOne({ _id: productId });
    }

    async findEvaluationsByProductId(productId) {
        return await Evaluate.find({ idProduct: productId })
            .populate({
                path: "idAccount",
                select: "firstName lastName avatar",
            })
            .sort({ date: -1 });
    }

    async countEvaluationsByProductId(productId) {
        return await Evaluate.find({ idProduct: productId }).countDocuments();
    }

    async calculateAverageRating(productId) {
        const ratings = await Evaluate.find({
            idProduct: productId,
            rating: { $ne: 0 },
        }).select("rating");
        const total = ratings.length;
        const sum = ratings.reduce((acc, item) => acc + item.rating, 0);
        return total > 0 ? sum / total : 0;
    }

    async findRelatedProducts(keyword) {
        return await Product.aggregate([
            {
                $match: { keyword: keyword },
            },
            { $limit: 6 },
        ]);
    }

    async updateProductStatus(productId, status) {
        return await Product.updateOne({ _id: productId }, { $set: { status: status } });
    }

    async findAllProductsPaginated(page, limit) {
        return await Product.find()
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countAllProducts() {
        return await Product.find().countDocuments();
    }

    async findBannedProductsPaginated(page, limit) {
        return await Product.find({ status: "Banned" })
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countBannedProducts() {
        return await Product.find({ status: "Banned" }).countDocuments();
    }

    async findPendingProductsPaginated(page, limit) {
        return await Product.find({ status: "Pending" })
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countPendingProducts() {
        return await Product.find({ status: "Pending" }).countDocuments();
    }

    async findReportedProductsPaginated(page, limit) {
        return await Product.find({ status: "Reported" })
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countReportedProducts() {
        return await Product.find({ status: "Reported" }).countDocuments();
    }

    async findTrendingProductsPaginated(page, limit) {
        const criteria = {
            $or: [{ status: "Available", isTrend: true }, { status: "Trending" }]
        };
        return await Product.find(criteria)
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countTrendingProducts() {
        const criteria = {
            $or: [{ status: "Available", isTrend: true }, { status: "Trending" }]
        };
        return await Product.find(criteria).countDocuments();
    }

    async updateProductStatusById(productId, actionType) {
        const product = await Product.findById(productId);
        switch (actionType) {
            case "ban":
            case "deny":
                product.status = "Banned";
                break;
            case "unban":
            case "remove":
            case "accept":
                product.status = "Available";
                break;
            case "acptrend":
                product.status = "Available";
                product.isTrend = true;
                break;
            case "denytrend":
                product.status = "Pending";
                product.isTrend = false;
                break;
            default:
                product.status = "Available"; // Default to Available if unspecified
                break;
        }
        return await product.save();
    }
}

module.exports = new ProductRepository();
