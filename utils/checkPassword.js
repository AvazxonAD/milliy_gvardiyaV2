const zxcvbn = require('zxcvbn');

const checkPasswordStrength = (password) => {
    const result = zxcvbn(password);
    return {
        score: result.score,
        feedback: `Parol yetarli darajada xavfsiz emas.
                Katta harf va kichik harf (Mixed case letters): Katta (A-Z) va kichik (a-z) harflaridan foydalaning.
                Raqamlar (Numbers): Raqamlardan foydalaning.
                Belgilar (Symbols): Maxsus belgilar (masalan, !@#$%^&*)dan foydalaning.`
    };
};

module.exports = checkPasswordStrength;
