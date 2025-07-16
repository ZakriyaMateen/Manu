export const trustGateway = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];

    if (!userId || !role) {
        return res.status(403).json({ message: "Unauthorized - missing user info" });
    }

    // Optionally attach user info to req
    req.user = { _id: userId, role };
    next();
};
