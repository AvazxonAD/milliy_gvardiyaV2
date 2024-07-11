exports.checkBattailonsIsNull = (battalions) => {
    for (let battalion of battalions){
        if(!battalion.name || typeof battalion.workerNumber !== 'number' || battalion.workerNumber < 1){
            return false
        }
    }
    return true
}

// return workerNumber and allMoney 
exports.returnWorkerNumberAndAllMoney = (oneTimeMoney, battalions, discount, taskTime) => {
    let workerNumber = 0;
    let money = 0
    let allMoney = 0;
    let discountMoney = null;

    for (let battalion of battalions) {
        let battalionMoney = oneTimeMoney * taskTime * battalion.workerNumber;
        workerNumber += battalion.workerNumber;
        
        money += battalionMoney;

        // Diskountni qo'llash
        if (discount) {
            battalionMoney *= (discount / 100);
            discountMoney += Math.round(battalionMoney * 100) / 100
        }
    }
    if(discount){
        allMoney = money - discountMoney
    }else{
        allMoney = money
    }

    return { workerNumber, allMoney, discountMoney, money};
}

// return update battalion
exports.returnBattalion = (oneTimeMoney, battalions, discount, taskTime) => {
    let result = [];
    
    if (discount) {
        oneTimeMoney = Math.round(((oneTimeMoney * (1 - discount / 100)) * 100)) / 100
    }
    
    for (let battalion of battalions) {

        result.push({
            name: battalion.name,
            oneTimeMoney,
            workerNumber: battalion.workerNumber,
            taskTime            
        })
    }

    return result;
}
