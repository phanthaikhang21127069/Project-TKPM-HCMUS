const { convertDate } = require("../helpers/handlebars");
const Account = require("../models/account.model");
const Announcement = require("../models/announcement.model");
const AnnouncementRepository = require('../repositories/AnnouncementRepository');

const {
  mutipleMongooseToObject,
  mongooseToObject,
} = require("../utils/mongoose");

class announceController {
  // [GET] announcement
  getNewAnnouncement = (req, res, next) => {
    try {
      res.render("admin_announcement");
    } catch (err) {
      next(err);
    }
  };

  // [POST] announcement/post
  postNewAnnouncement = async (req, res, next) => {
    try {
      const { title, content, recipient } = req.body;
      await AnnouncementRepository.create({ title, recipient, content });
      res.redirect("/announcement/all");
    } catch (err) {
      next(err);
    }
  };

  // [GET] announcement/all
  getAllAnnouncement = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;
      const { announcements, total } = await AnnouncementRepository.findAllPaginated({ page, limit });

      res.render("admin_all_announcement", {
        convertDate: convertDate,
        announcements: mutipleMongooseToObject(announcements),
        _numberOfItems: total,
        _limit: limit,
        _currentPage: page
      });
    } catch (err) {
      next(err);
    }
  };

  // [GET] /announcement/list
  getListAnnouncement = async (req, res, next) => {
    try {
      if (req.user) {
        const announcements = await AnnouncementRepository.findForUser({ user: req.user });
        res.json({ announcements });
      } else {
        res.json({});
      }
    } catch (err) {
      next(err);
    }
  };

  // [POST] /announcement/list/:idx
  updateListAnnouncement = async (req, res, next) => {
    try {
      await AnnouncementRepository.updateReadAnnouncements({
        userId: req.user._id,
        readAnnounce: req.session.readAnnounce
      });
      res.json(req.session.readAnnounce);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new announceController();
