export const parseFormData = (req) => {
    const { name, email, role, ...rest } = req.body;
    return {
        name: name?.trim(),
        email: email?.toLowerCase(),
        role,
        ...rest
    };
};