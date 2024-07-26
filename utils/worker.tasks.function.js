exports.getWorkerAllMoney = (tasks) => {
    let AllMoney = 0
    for(let task of tasks){
        AllMoney += task.summa
    }
    return AllMoney
}

// block task 
exports.blockTask = (tasks) => {
    let result = []
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
 
// sum money 
exports.sumMoney = (discount, timemoney, tasktime) => {
    result = {}
    const total = timemoney * tasktime;
    if (discount) {
        const discountAmount = total * (discount / 100);
        result.summa = Math.round((total - discountAmount) * 100) / 100 
        result.timemoney = result.summa / tasktime
        return result
    }
    result.summa = Math.round(total * 100) / 100;
    result.timemoney = result.summa / tasktime
    return result
}