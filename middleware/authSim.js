const authSimulation = (req, res, next) => {
    if (req.query.auth === '1') {
        req.user = {
            name: 'Полина (Автор Чердака)',
            isAuth: true
        };
    } else {
        req.user = {
            name: 'Гость',
            isAuth: false
        };
    }

    res.locals.user = req.user;

    next();
};

module.exports = authSimulation;