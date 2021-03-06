const Rooms=require('../model/Rooms');
const Reservation=require('../model/Reservation');
const CustomerInfo=require('../model/CustomerInfo');

module.exports=function(){
	var db=global.db.collection('reservation');
	var reservationDao={};
	
	// CRUD on reservation table
	// 1. Create
	// Input: data(type Reservation), nextJob(function(_id of inserted data))
	reservationDao.insert=function(data,nextJob){
		db.insertOne(data.toJson()).then(nextJob);
	};
	
	// 2. Read
	// 2A. Search by reservation number(rid)
	// Input: rid(reservation number), nextJob(function(Reservation))
	// If Success 	: nextJob(FOUND_RESERVATION_OBJECT)
	// If fail		: nextJob(null)
	reservationDao.queryRid=function(rid,nextJob){
		db.findOne({_id:new global.db.ObjectID(rid), validity:'Valid'},
				function(err,r){
			if(err) console.error(err);
			nextJob(Reservation.buildFromJson(r));});
	};
	// 2A-2. Search by reservation customer name
	// Input: name, nextJob(function(Reservation[]))
	reservationDao.queryName=function(name,nextJob){
		db.find({"customerInfo.name":name, validity:'Valid'}).toArray().then(
				function(result){nextJob(Reservation.buildFromJsonArray(result));
				});
	};
	// 2A-3. Search by reservation customer email
	// Input: email, nextJob(function(Reservation[]))
	reservationDao.queryEmail=function(email,nextJob){
		db.find({"customerInfo.email":email, validity:'Valid'}).toArray().then(
				function(result){nextJob(Reservation.buildFromJsonArray(result));
				});
	};
	// 2A-4. Search by reservation customer phone
	// Input: phone, nextJob(function(Reservation[]))
	reservationDao.queryPhone=function(phone,nextJob){
		db.find({"customerInfo.phoneNumber":phone, validity:'Valid'}).toArray().then(
				function(result){nextJob(Reservation.buildFromJsonArray(result));
				});
	};
	// 2B. Search by reservation customer ID(cid)
	// Input: cid(customer ID), nextJob(function(Reservation[]))
	reservationDao.queryCid=function(cid,nextJob){
		db.find({"customerInfo.id":cid, validity:'Valid'}).toArray().then(
				function(result){nextJob(Reservation.buildFromJsonArray(result));
				});
	};
	// 2C. Search by reservation start date(startDate)
	// Input: cid(customer ID), nextJob(function(Reservation[]))
	reservationDao.queryStartDate=function(startDate,nextJob){
		db.find({startDate:startDate, validity:'Valid'}).toArray().then(
				function(result){console.log(result);console.log();nextJob(Reservation.buildFromJsonArray(result));});
	};

	// 3. Update
	// 3A. Update reservation information
	// Update email and name for the reservation with the given ID.
	// Input: rid, customerInfo(type CustomerInfo), nextJob(function(_id of updated data))
	reservationDao.updateInfo=function(rid,customerInfo,email,nextJob){
		db.updateOne(
				{_id: new global.db.ObjectID(rid), validity:'Valid'},
				{$set: { customerInfo: customerInfo.toJson() },
				    $currentDate: { lastModified: true }}).then(nextJob);
	};
	// 3B. Invalidate reservation by reservation number(rid)
	// Set the validity flag invalid, for the reservation with the given ID.
	// Input: rid, nextJob(function(_id of updated data))
	reservationDao.invalidate=function(rid,nextJob){
		db.updateOne(
				{_id: new global.db.ObjectID(rid), validity:'Valid'},
				{$set: { validity: Reservation.validityList().invalid },
				    $currentDate: { lastModified: true }}).then(nextJob);
	};
	// 3C. Set the reservation paid(rid)
	// Set the validity flag invalid, for the reservation with the given ID.
	// Input: rid, nextJob(function(_id of updated data))
	reservationDao.setPaid=function(rid,nextJob){
		console.log('SetPaid');
		console.log(rid);
		db.updateOne(
				{_id: rid, validity:'Valid'},
				{$set: { status: Reservation.statusList().paid },
				    $currentDate: { lastModified: true }}).then(nextJob);
	};
	
	// 4. Delete (N/A)

	// 4. Modification
	// 넘겨준 방 정보를 변경
	reservationDao.modifyReservation = function(rid, rooms, phoneNumber, nextJob) {
		db.updateOne(
			{_id: new global.db.ObjectID(rid), validity:'Valid'},
			{
				$set: {'customerInfo.phoneNumber': phoneNumber, rooms: rooms.toJson()},
				$currentDate: {lastModified: true}
			}
		).then(nextJob);
	};
	// 전화번호만 변경
	reservationDao.modifyPhone = function(rid, phoneNumber, nextJob) {
		db.updateOne(
			{_id: new global.db.ObjectID(rid), validity:'Valid'},
			{
				$set: {'customerInfo.phoneNumber': phoneNumber},
				$currentDate: {lastModified: true}
			}
		).then(nextJob);
	};
	
	// 5. Aggregation
	// 5A. 호텔의 전체 방 개수를 질의한다.
	// hotel:호텔, nextJob:다음에 처리할 일(인자 1개: Rooms)
	reservationDao.queryTotalRooms=function(hotel,nextJob){
		global.db.collection('room').findOne({hotel:hotel}).then(
				function(result){nextJob(Rooms.buildFromJson(result));});
	};
	
	// 5B. 해당 기간에 예약된 방 개수의 종류별 최대값을 확인한다.
	// startDate:체크인 날짜, endDate:체크아웃 날짜, hotel:호텔, nextJob:다음에 처리할 일(인자 1개: 결과값)
	reservationDao.queryRoomsByDate=function(startDate,endDate,hotel,nextJob){
		global.db.collection('reservedRoomsByDate').aggregate([
			{$match : {date:{ $gte: startDate, $lt: endDate }, hotel:hotel}},
			{$group : {
				_id: null,
				singleRoom: { $max: "$singleRoom" },
				doubleRoom: { $max: "$doubleRoom" },
				suiteRoom: { $max: "$suiteRoom" }}
			}
		]).toArray().then(function(result){
			nextJob(Rooms.buildFromJson(result[0]));
		});
	};
	
	// 5C. 해당 날짜에 예약된 방 개수를 증가시킨다.
	// date: 날짜, rooms:예약한 방 목록, hotel:호텔, nextJob:다음에 처리할 일(인자 0개)
	reservationDao.updateRoomsByDate=function(date,rooms,hotel,nextJob){
		global.db.collection('reservedRoomsByDate').update(
			{ date:date,hotel:hotel },
			{
				$setOnInsert:{date:date,hotel:hotel},
				$inc: rooms.toJson()
			},
			{ upsert: true }
			).then(function(result){nextJob();});
	};
	
	// 5D. 해당 날짜 구간에 예약된 방 개수를 증가시킨다.
	// date: 날짜, rooms:예약한 방 목록, hotel:호텔, nextJob:다음에 처리할 일(인자 0개)
	reservationDao.updateRoomsByDateRange=function(startDate,endDate,rooms,hotel,nextJob){
		global.db.collection('reservedRoomsByDate').updateMany(
			{ date:{$gte:startDate,$lt:endDate},hotel:hotel },
			{ $inc: rooms.toJson()}
			).then(function(result){nextJob();});
	};
	return reservationDao;
};