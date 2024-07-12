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
    
    for (let battalion of battalions) {
        let allMoney = 0;
        let discountMoney = null;
        let money = oneTimeMoney * taskTime * battalion.workerNumber;
        if (discount) {
            discountMoney = money * (discount / 100);
            discountMoney += Math.round(discountMoney * 100) / 100     
            allMoney = money - discountMoney      
        }else{
            allMoney = money
        }

        result.push({
            name: battalion.name,
            oneTimeMoney,
            allMoney,
            discountMoney,
            money,
            workerNumber: battalion.workerNumber,
            taskTime            
        })
    }

    return result;
}

// block tasks 
exports.blockTasks = (tasks) => {
    result = []
    for(let task of tasks){
        if(task.inprogress){
            const dateObject = new Date(task.taskdate)
            dateObject.setDate(dateObject.getDate() + 2);
            if(dateObject.getTime() < new Date().getTime()){
                result.push({
                    id: task.id, 
                    notdone: true
                })
            }
        }
    }
    return result
}