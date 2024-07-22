module.exports = (fio) => {
    const fioPattern = /^[\p{Lu}][\p{L}'ʼ’]* [\p{Lu}][\p{L}'ʼ’]* [\p{Lu}][\p{L}'ʼ’]*(ович|евна|овна|оғли|қизи|og'li|qizi)?$/u;
    return fioPattern.test(fio);
};
