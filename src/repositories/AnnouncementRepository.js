const Announcement = require('../models/announcement.model');

class AnnouncementRepository {
    async create({ title, recipient, content }) {
        const announcement = new Announcement({ title, recipient, content });
        return announcement.save();
    }

    async findAllPaginated({ page, limit }) {
        const skip = (page - 1) * limit;
        const announcements = await Announcement.find().sort({ time: -1 }).skip(skip).limit(limit);
        const total = await Announcement.countDocuments();
        return { announcements, total };
    }

    async findForUser({ user, limit }) {
        const announcements = await Announcement.find({
            $or: [{ recipient: "Everyone" }, { recipient: `${user.role}s` }]
        }).sort({ time: -1 });
        return announcements;
    }

    async updateReadAnnouncements({ userId, readAnnounce }) {
        return Account.updateOne({ _id: userId }, { readAnnounce });
    }
}

module.exports = new AnnouncementRepository();
