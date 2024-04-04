//Install Command:
//npm init -y
//npm i express express-handlebars body-parser mongoose express-fileupload bcrypt connect-mongodb-session express-session 

const express = require('express');
const server = express();

const bodyParser = require('body-parser');
server.use(express.json()); 
server.use(express.urlencoded({ extended: true }));

const fileUpload = require('express-fileupload');
server.use(fileUpload());
const path = require('path');

const handlebars = require('express-handlebars');
server.set('view engine', 'hbs');
server.engine('hbs', handlebars.engine({
    extname: 'hbs'
}));

server.use(express.static('public'));

const bcrypt = require('bcrypt');
const saltRounds = 10;

const mongoose = require('mongoose');
const uri = "mongodb+srv://francesgo:reviewdb@estreview.ks8xuqa.mongodb.net/?retryWrites=true&w=majority&appName=estreview";
//const uri = "mongodb://127.0.0.1:27017/estreviewdb";
mongoose.connect(uri);

const session = require('express-session');
const mongoStore = require('connect-mongodb-session')(session);

server.use(session({
    secret: 'secretMP',
    saveUninitialized: true, 
    resave: false,
    store: new mongoStore({ 
      uri: uri,
      collection: 'sessionMP',
      expires: 1000*60*60 // 1 hour
    })
}));

server.get('/session/destroy', function(req, resp) {
    console.log("test");
    req.session.destroy();
    resp.status(200).send('ok');
});

function errorFn(err){
    console.log('Error found. Please trace!');
    console.error(err);
}

const establishmentSchema = new mongoose.Schema({
    name: { type: String },
    description: { type: String },
    location: { type: String },
    owner: { type: String },
    recommendedPercent: { type: String },
    estPhoto: { type: String },
    estNum: { type: Number }
},{ versionKey: false });
  
const establishmentModel = mongoose.model('establishment', establishmentSchema);

const userSchema = new mongoose.Schema({
    name: { type: String },
    password: { type: String },
    isAdmin: { type: Boolean },
    profilePicture: { type: String },
    shortDescription: { type: String },
    email: { type: String },
    isOwner: { type: Boolean }
},{ versionKey: false });
  
const userModel = mongoose.model('user', userSchema);

const reviewSchema = new mongoose.Schema({
    title: { type: String },
    establishment: { type: Object},
    imgVidLink: [{ type: String }],
    user: { type: Object },
    contents: { type: String },
    isRecommended: { type: Boolean },
    reviewNum: { type: Number },
    hasReply: { type: Boolean },
    ownerReply: { type: String },
    helpful: { type: Number },
    notHelpful: { type: Number },
    hasMedia:{ type: Boolean },
    isEdited:{ type: Boolean },
    helpfulBy: [{ type :  mongoose.Schema.Types.ObjectId, ref: 'user' }],
    nothelpfulBy: [{ type :  mongoose.Schema.Types.ObjectId, ref: 'user' }],
    helpClass:{ type: String },
    nothelpClass:{ type: String },
    isReplyEdited: { type: Boolean }
},{ versionKey: false });
  
const reviewModel = mongoose.model('review', reviewSchema);

//let loggedUser = {};
//let login = false;

function calcRec(id){

    reviewModel.countDocuments({"establishment._id": id}).then(function(count){
        console.log( "Number of reviews:"+ count );
        
        reviewModel.aggregate(
            [
                { $match: { isRecommended: true,"establishment._id": id }},
                { "$group": { "_id": {"establishment":  "$establishment._id"}, "count": { "$sum": 1 }}},    
                { "$project": { 
                    "count": 1, 
                    "percentage": { 
                        "$concat": [ {$toString: [{ "$round": [ { "$multiply": [ { "$divide": [ "$count", {"$literal": count }] }, 100 ] }, 2 ] }]}, ""]}
                    }
                }
            ]
        ).exec().then(function(resultSet){ 
            console.log(resultSet[0]); 
            if(resultSet[0]!== undefined){
                
                establishmentModel.findOne({_id: id}).then(function(est) {
                    //console.log(est);
                    est.recommendedPercent = resultSet[0].percentage;
                    //console.log(est);
                    est.save().then(function (result) {
                        if(result){
                            console.log('Update successful');
                        }else{
                            console.log('review not found');
                        }
                        
                    }).catch(errorFn);
                }).catch(errorFn);
            }else{
                establishmentModel.findOne({_id: id}).then(function(est) {
                    //console.log(est);
                    est.recommendedPercent = "0";
                    est.save().then(function (result) {
                        if(result){
                            console.log('Update successful');
                        }else{
                            console.log('Establishment not found');
                        }
                        
                    }).catch(errorFn);
                }).catch(errorFn);
            }
        });    
    });
}

const quickSort = (arr) => {
    if (arr.length <= 1) {
      return arr;
    }
  
    let pivot = arr[0];
    let leftArr = [];
    let rightArr = [];
  
    for (let i = 1; i < arr.length; i++) {
      if (Number(arr[i].recommendedPercent) > Number(pivot.recommendedPercent)) {
        leftArr.push(arr[i]);
      } else {
        rightArr.push(arr[i]);
      }
    }
  
    return [...quickSort(leftArr), pivot, ...quickSort(rightArr)];
};

const helpfulSort = (arr) => {
    if (arr.length <= 1) {
      return arr;
    }
  
    let pivot = arr[0];
    let leftArr = [];
    let rightArr = [];
  
    for (let i = 1; i < arr.length; i++) {
      if (Number(arr[i].helpful) > Number(pivot.helpful)) {
        leftArr.push(arr[i]);
      } else {
        rightArr.push(arr[i]);
      }
    }
  
    return [...quickSort(leftArr), pivot, ...quickSort(rightArr)];
};

function loadReviews(login_user){
    const searchQuery = {};

    reviewModel.find(searchQuery).lean().then(function(review){
        for(let i=0;i<review.length;i++){
            revQuery = {_id: review[i]._id}
            reviewModel.findOne(revQuery).then(function(rev){
                
                if(rev.helpfulBy.includes(login_user._id)){
                    rev.helpClass = "btn-success";
                    rev.nothelpClass = "btn-outline-success";
                }else if(rev.nothelpfulBy.includes(login_user._id)){
                    rev.helpClass = "btn-outline-success";
                    rev.nothelpClass = "btn-success";
                }else{
                    rev.helpClass = "btn-outline-success";
                    rev.nothelpClass = "btn-outline-success";
                }
                rev.save().then(function (result) {
                    if(result){
                        console.log('reviews updated');
                    }else{
                        console.log('error in updating');
                    }
                
                }).catch(errorFn);
                
            }).catch(errorFn);
        }
    }).catch(errorFn);
}

server.get('/', function(req, resp){
    const searchQuery = {};
    var name;
    var pfp;
    if(req.session.login_user!=undefined){
        name = req.session.login_user.name;
        pfp = req.session.login_user.profilePicture;
    }

    establishmentModel.find(searchQuery).lean().then(function(establishment_data){
        for(let i=0;i<establishment_data.length;i++){
            establishment_data[i].estNum = i+1;
        }
        const data = quickSort(establishment_data);
        console.log(data);
        resp.render('home',{
            layout: 'index',
            title: 'Home',
            'establishment-data': data,
            login: req.session.login_user != undefined,
            loggedUser: name,
            loggedPhoto: pfp
        });
    }).catch(errorFn);
    
});

server.get('/about', function(req, resp){
    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }
    resp.render('about',{
        layout: 'index',
        title: 'About',
        login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
        loggedUser: name,
        isOwner: isOwner,
    });
});

server.get('/log-in', function(req, resp){

    resp.render('log-in',{
        layout: 'index',
        title: 'Log in',
        login: req.session.login_user != undefined,
    });
});

server.get('/log-in/failed', function(req, resp){

    resp.render('log-in',{
        layout: 'index',
        title: 'Log in',
        login: req.session.login_user != undefined,
        failed: true
    });
});

server.post('/read-user', function(req, resp){
    const searchQuery = { name: req.body.user};
  
    //The model can be found via a search query and the information is found
    //in the login function. Access the information like a JSon array.
    userModel.findOne(searchQuery).then(function(login_user){
        console.log('Attempting log in');
        bcrypt.compare(req.body.pass, login_user.password, function(err, result) {
            if(login_user != undefined && login_user._id != null && result == true){
                //loggedUser = login_user;
                req.session.login_user = login_user;
                req.session.login_id = req.sessionID;

                if(req.session.login_user.isOwner == false){
                    //login = true;
                    loadReviews(req.session.login_user);
                    resp.redirect('/');
                }else{
                    resp.redirect('/owner/' + req.session.login_user.name);
                }
              
            }else{
                resp.redirect('/log-in/failed');
            }
        });
        
    }).catch(errorFn);
});

server.get('/log-out', function(req, resp){
    const searchQuery = {};

    reviewModel.find(searchQuery).lean().then(function(review){
        for(let i=0;i<review.length;i++){
            revQuery = {_id: review[i]._id}
            reviewModel.findOne(revQuery).then(function(rev){
 
                rev.helpClass = "btn-outline-success";
                rev.nothelpClass = "btn-outline-success";
                
                rev.save().then(function (result) {
                    if(result){
                        console.log('reviews updated');
                    }else{
                        console.log('error in updating');
                    }
                
                }).catch(errorFn);
                
            }).catch(errorFn);
        }
    }).catch(errorFn);

    req.session.destroy(function(err) {
        resp.redirect('/');
    });
});

server.get('/sign-up', function(req, resp){
    resp.render('sign-up',{
        layout: 'index',
        title: 'Sign up',
        login: req.session.login_user != undefined,
        //loggedUser: req.session.login_user.name
    });
});

server.post('/create-user', function(req, resp){
    var pfp;
    if(req.files){
        const {media} = req.files;
        console.log(req.files);
        media.mv(path.resolve(__dirname,'public/source',media.name),(error) => {
            if(error){
                console.log ("Error!")
            }
        })
        pfp = "/source/" + media.name;
    }else{
        pfp = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
    }

    bcrypt.hash(req.body.pass, saltRounds, function(err, hash) {
        const user = userModel({
            name: req.body.username,
            password: hash,
            profilePicture: pfp,
            shortDescription: req.body.bio,
            email: req.body.email,
            isOwner: false
            
        });
        console.log(user);
        user.save().then(function(acc){
            console.log('User created');
            req.session.login_user = acc;
            req.session.login_id = req.sessionID;
            resp.redirect('/');
        }).catch(errorFn);
    });
});

server.post('/check-username', function(req, resp){
    const revQuery = { name: req.body.user };
    //console.log(req.body.id);

    userModel.findOne(revQuery).then(function(user) {
        //console.log(user);
        if(user != undefined && user._id != null){
            resp.send({exists: true});
        }else{
            resp.send({exists: false});
        }
        
    }).catch(errorFn);
});

server.post('/check-email', function(req, resp){
    const revQuery = { email: req.body.email };
    //console.log(req.body.id);

    userModel.findOne(revQuery).then(function(user) {
        //console.log(user);
        if(user != undefined && user._id != null){
            resp.send({exists: true});
        }else{
            resp.send({exists: false});
        }
        
    }).catch(errorFn);
});

server.get('/search', function(req, resp){
    var choice = req.query.search_param;
    var filter;

    const estQuery = [{name: {$regex: req.query.search, $options: 'i'}},{description: {$regex: req.query.search, $options: 'i'}}];
    const revQuery = [{title: {$regex: req.query.search, $options: 'i'}},{contents: {$regex: req.query.search, $options: 'i'}}];

    if(choice === "restaurant"){
        filter = true;
    }else{
        filter = false;
    }

    //console.log(req.query.search);

    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }

    reviewModel.find().or(revQuery).lean().then(function(review_data){
        establishmentModel.find().or(estQuery).lean().then(function(establishment_data){
            var hasReviews = true;
            var hasNext = false;
            var hasnoEst = false;
            
            if(review_data.length == 0){
                hasReviews = false;
            }
            if(establishment_data.length == 0 && filter){
                hasnoEst = true;
                
            }
            const sortedRev = helpfulSort(review_data);

            const setRev = sortedRev.splice(0,5)


            if(sortedRev.length>0 && filter == false){
                hasNext = true;
            }

            for(let i=0;i<establishment_data.length;i++){
                establishment_data[i].estNum = i+1;
            }

            for(let i=0;i<setRev.length;i++){
                setRev[i].reviewNum = i+1;
            }
            resp.render('search',{
                layout: 'index',
                title: 'Search',
                filter: filter,
                search: req.query.search,
                both: true,
                'establishment-data': quickSort(establishment_data),
                'review-data': setRev,
                login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
                loggedUser: name,
                hasReviews: hasReviews,
                isOwner: isOwner,
                hasnoEst: hasnoEst,
                hasPrev: false,
                hasNext: hasNext,
                nextNum: "page1"
            });
        }).catch(errorFn);
    }).catch(errorFn);
});

server.get('/search/:search/page:num', function(req, resp){
    //var choice = req.query.search_param;
    var filter;

    //const estQuery = [{name: {$regex: req.query.search, $options: 'i'}},{description: {$regex: req.query.search, $options: 'i'}}];
    const revQuery = [{title: {$regex: req.params.search, $options: 'i'}},{contents: {$regex: req.params.search, $options: 'i'}}];

    /*if(choice === "restaurant"){
        filter = true;
    }else{
        filter = false;
    }*/

    //console.log(req.query.search);

    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }

    reviewModel.find().or(revQuery).lean().then(function(review_data){
        //establishmentModel.find().or(estQuery).lean().then(function(establishment_data){
            var hasReviews = true;
            var hasNext = false;
            var page = Number(req.params.num);
            var prevNum;
            //var hasnoEst = false;
            if(review_data.length == 0){
                hasReviews = false;
            }
            //if(establishment_data.length == 0 && filter){
            //    hasnoEst = true;
                
            //}
            //console.log(hasnoEst);
            /*for(let i=0;i<establishment_data.length;i++){
                establishment_data[i].estNum = i+1;
            }*/
            const sortedRev = helpfulSort(review_data);
            var numtemp = page + (5 * page) + 4;
            const temp = sortedRev.splice(0, numtemp);
            //console.log(numtemp);
            //console.log(page + 4);
            //console.log(temp.length);
            const setRev = temp.splice(page * 5,page + 5);

            //console.log(setRev.length);
            //console.log(review_data.length);

            if(sortedRev.length>0){
                hasNext = true;
            }


            for(let i=0;i<setRev.length;i++){
                setRev[i].reviewNum = i+1;
            }

            if(page == 1){
                prevNum = "?search_param=review&search=" + req.params.search;
            }else{
                var n = page - 1;
                prevNum = req.params.search + "/page" + n; 
            }
            //console.log(prevNum);
            page++;
            resp.render('search',{
                layout: 'index',
                title: 'Search',
                filter: filter,
                search: req.params.search,
                both: true,
                //'establishment-data': establishment_data,
                'review-data': setRev,
                login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
                loggedUser: name,
                hasReviews: hasReviews,
                isOwner: isOwner,
                //hasnoEst: hasnoEst
                hasPrev: true,
                prevNum: prevNum,
                hasNext: hasNext,
                nextNum: "page" + page
            });
        //}).catch(errorFn);
    }).catch(errorFn);
});

server.get('/write-review/:id', function(req, resp){
    const searchQuery = {_id: req.params.id};

    establishmentModel.findOne(searchQuery).lean().then(function(establishment){
        resp.render('write-review',{
            layout: 'index',
            title: 'Write Review',
            establishment: establishment,
            login: req.session.login_user != undefined,
            loggedUser: req.session.login_user.name
        });
    }).catch(errorFn);
});

server.post('/submit-review', function(req, resp){
    const userSearch = {name: req.session.login_user.name};
    const estSearch = {_id: req.body.restaurant};

    userModel.findOne(userSearch).then(function(user_data){
        establishmentModel.findOne(estSearch).then(function(establishment_data){
            let hasImage = false;
            const filedir = [];
           
            if(req.files){
                hasImage = true;
                const {media} = req.files;
                console.log(req.files);
                if(media.length>1){
                    for(let i = 0 ; i < media.length; i++){
                        media[i].mv(path.resolve(__dirname,'public/source',media[i].name),(error) => {
                            if(error){
                                console.log ("Error!")
                            }
                        })

                        filedir.push("/source/" + media[i].name);
                    }
                }else{
                    media.mv(path.resolve(__dirname,'public/source',media.name),(error) => {
                        if(error){
                            console.log ("Error!")
                        }
                    })
                    filedir.push("/source/" + media.name);
                }
                console.log ("Files uploaded!");
            }

            const post = reviewModel({
                title: req.body.title,
                establishment: establishment_data,
                imgVidLink: filedir,
                user: user_data,
                contents: req.body.review,
                isRecommended: req.body.rec,
                reviewNum: 0,//check if it works
                hasReply: false,
                ownerReply: "",
                helpful: 0,
                notHelpful: 0,
                hasMedia: hasImage,
                isEdited: false,
                helpfulBy: [],
                nothelpfulBy: [],
                helpClass: "btn-outline-success",
                nothelpClass: "btn-outline-success"
            });

            console.log(post);
            post.save().then(function(review) {
                console.log('Review created');
                console.log(review);
                calcRec(review.establishment._id);
                resp.redirect('/profile/' + req.session.login_user.name);
            }).catch(errorFn);
        }).catch(errorFn);
    }).catch(errorFn);

});

server.post('/update-review', function(req, resp){
    const updateQuery = { _id: req.body.id };

    reviewModel.findOne(updateQuery).then(function(review) {
        const media = [];

        for(let i=0; i<6;i++){
            if(req.body.media[i] !== ""){
                media.push(req.body.media[i]);
            }
        }

        console.log(media);

        if(media.length === 0){
            review.hasMedia = false;
        }

        review.title = req.body.title;
        review.contents = req.body.review;
        review.isRecommended = req.body.rec;
        review.imgVidLink = media;
        review.isEdited = true;
        review.save().then(function (result) {
            if(result){
                console.log('Update successful');
                calcRec(result.establishment._id);
                resp.redirect('/profile/' + req.session.login_user.name + "/" +req.body.page);
            }else{
                console.log('review not found');
            }
            
        }).catch(errorFn);
    }).catch(errorFn);
});

server.post('/delete-review', function(req, resp){
    const deleteQuery = { _id: req.body.id };

    reviewModel.findOne(deleteQuery).then(function(del) {
       reviewModel.deleteOne(deleteQuery).then(function(review) {
            console.log(del);
            calcRec(del.establishment._id);
            resp.redirect('/profile/' + req.session.login_user.name);
        }).catch(errorFn);
    }).catch(errorFn);
    
});

server.post('/helpful', function(req, resp){
    const revQuery = { _id: req.body.id };
    console.log(req.body.id);

    reviewModel.findOne(revQuery).then(function(review) {
        var alert = false;
        var isOwner;

        if(req.session.login_user != undefined ){
            isOwner = req.session.login_user.isOwner;
        }
        if(req.session.login_user != undefined && isOwner == false){
            if(String(req.body.selectHelp)=="true" ){
                review.helpful++;
                review.helpfulBy.push(req.session.login_user._id);
                review.helpClass = "btn-success";
                if(String(req.body.selectNot)=="true"){
                    console.log(String(req.body.selectNot));
                    review.notHelpful--;
                    review.nothelpfulBy.pop(req.session.login_user._id);
                    review.nothelpClass = "btn-outline-success";
                    //console.log("test");
                }
            }else{
                review.helpful--;
                review.helpfulBy.pop(req.session.login_user._id);
                review.helpClass = "btn-outline-success";
            }
        }else{
            alert = true;
        }
        
        //console.log(alert);
            
        review.save().then(function (result) {
            resp.send({review: review, h: result.helpful, n: result.notHelpful, alert: alert});
            console.log(result.helpful);
            console.log(result.notHelpful);
        }).catch(errorFn);
        
    }).catch(errorFn);
    //resp.send({review: req.body.id});
    
});

server.post('/not-helpful', function(req, resp){
    
    const revQuery = { _id: req.body.id };
    console.log(req.body.id);

    reviewModel.findOne(revQuery).then(function(review) {
        var alert = false;
        var isOwner;

        if(req.session.login_user != undefined ){
            isOwner = req.session.login_user.isOwner;
        }

        if(req.session.login_user != undefined && isOwner == false){
            if(String(req.body.selectNot)=="true"){
                review.notHelpful++;
                review.nothelpfulBy.push(req.session.login_user._id);
                review.nothelpClass = "btn-success";
                if(String(req.body.selectHelp)=="true"){
                    review.helpful--;
                    console.log("test")
                    review.helpfulBy.pop(req.session.login_user._id);
                    review.helpClass = "btn-outline-success";
                }
            }else{
                review.notHelpful--;
                review.nothelpfulBy.pop(req.session.login_user._id);
                review.nothelpClass = "btn-outline-success";
            }
        }else{
            alert = true;
        }
        //console.log(req.body.selectHelp);
            
        review.save().then(function (result) {
            resp.send({review: review, h: result.helpful, n: result.notHelpful, alert: alert});
            console.log(result.helpful);
            console.log(result.notHelpful);
        }).catch(errorFn);
        
    }).catch(errorFn);
});

server.post('/update-profile', function(req, resp){
    const updateQuery = { _id: req.body.id };

    userModel.findOne(updateQuery).then(function(user) {
        var media;

        
        if(req.body.media !== ""){
            media = req.body.media;
        }else{
            media = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
        }
        
        console.log(media);

        user.name = req.body.username;
        user.shortDescription = req.body.bio;
        user.profilePicture = media;
        user.save().then(function (result) {
                if(result){
                    console.log('Update successful');
                    resp.redirect('/profile/' + req.session.login_user.name);
                }else{
                    console.log('user not found');
                }
            
        }).catch(errorFn);
    }).catch(errorFn);
});

server.get('/profile/:username', function(req, resp){
    const searchQuery = {name: req.params.username};
    const revSearch = {'user.name': req.params.username};

    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }
    if(req.params.username == name && name != undefined){
        var userprofile = true;
    }else{
        var userprofile = false;
    }

    //console.log(userprofile);
    userModel.find(searchQuery).lean().then(function(user_data){
        reviewModel.find(revSearch).lean().then(function(review_data){
            var hasReviews = true;
            var hasNext = false;
            if(review_data.length == 0){
                hasReviews = false;
            }
            review_data.reverse();
            const setRev = review_data.splice(0,5);

            if(review_data.length>0){
                hasNext = true;
            }
            //console.log(review_data.length ==0);
            for(let i=0;i<setRev.length;i++){
                setRev[i].reviewNum = i+1;
            }

            resp.render('user-profile',{
                layout: 'index',
                title: 'Profile',
                restaurant: true,
                userprofile: userprofile,
                'review-data': setRev,
                login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
                loggedUser: name,
                hasReviews: hasReviews,
                isOwner: isOwner,
                user: user_data,
                hasPrev: false,
                hasNext: hasNext,
                nextNum: "page1"
            });
        }).catch(errorFn);
    }).catch(errorFn);
});

server.get('/profile/:username/page:num', function(req, resp){
    const searchQuery = {name: req.params.username};
    const revSearch = {'user.name': req.params.username};

    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }

    if(req.params.username == name && name != undefined){
        var userprofile = true;
    }else{
        var userprofile = false;
    }

    //console.log(userprofile);
    userModel.find(searchQuery).lean().then(function(user_data){
        reviewModel.find(revSearch).lean().then(function(review_data){
            var hasReviews = true;
            var hasNext = false;
            var prevNum;
            var page = Number(req.params.num);
            if(review_data.length == 0){
                hasReviews = false;
            }
            review_data.reverse();
            var numtemp = page + (5 * page) + 4;
            const temp = review_data.splice(0, numtemp);
            const setRev = temp.splice(page * 5,page + 5);

            //console.log(page);

            if(review_data.length>0){
                hasNext = true;
            }

            //console.log(review_data.length ==0);
            for(let i=0;i<setRev.length;i++){
                setRev[i].reviewNum = i+1;
            }

            if(page == 1){
                prevNum = "";
            }else{
                var n = page - 1;
                prevNum = "/page" + n; 
            }
            //console.log(prevNum);

            page++;
            console.log("page" + req.params.num);
            resp.render('user-profile',{
                layout: 'index',
                title: 'Profile',
                restaurant: true,
                userprofile: userprofile,
                'review-data': setRev,
                login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
                loggedUser: name,
                hasReviews: hasReviews,
                isOwner: isOwner,
                user: user_data,
                hasPrev: true,
                prevNum: prevNum,
                hasNext: hasNext,
                nextNum: "page" + page,
                currPage: "page" + req.params.num
            });
        }).catch(errorFn);
    }).catch(errorFn);
});

server.get('/owner/:name', function(req, resp){
    const searchQuery = {owner: req.params.name};
    
    establishmentModel.find(searchQuery).lean().then(function(establishment_data){
        
        for(let i=0;i<establishment_data.length;i++){
            establishment_data[i].estNum = i+1;
        }

        const data = quickSort(establishment_data);

        resp.render('owner',{
            layout: 'index',
            title: 'Owner Home',
            'establishment-data': data,
            isOwner: req.session.login_user.isOwner,
            loggedUser: req.params.name
        });
    }).catch(errorFn);
});

server.post('/owner-reply', function(req, resp){
    const updateQuery = { _id: req.body.id };

    reviewModel.findOne(updateQuery).then(function(review) {
        review.ownerReply = req.body.reply;
        review.hasReply = true;
        review.save().then(function (result) {
            if(result){
                resp.redirect('/restaurant/' + review.establishment.name + "/" + req.body.page);
            }else{
                console.log('review not found');
            }
            
        }).catch(errorFn);
    }).catch(errorFn);
});

server.post('/update-reply', function(req, resp){
    const updateQuery = { _id: req.body.id };

    reviewModel.findOne(updateQuery).then(function(review) {

        review.ownerReply = req.body.reply;
        review.isReplyEdited = true;
        review.save().then(function (result) {
            if(result){
                console.log('Update successful');
                resp.redirect('/restaurant/' + review.establishment.name + "/" + req.body.page);
            }else{
                console.log('review not found');
            }
            
        }).catch(errorFn);
    }).catch(errorFn);
});

server.post('/delete-reply', function(req, resp){
    const deleteQuery = { _id: req.body.id };

    reviewModel.findOne(deleteQuery).then(function(review) {
       
        review.hasReply = false;
        review.ownerReply = "";
        review.isReplyEdited = false;
        review.save().then(function (result) {
            if(result){
                console.log('Update successful');
                resp.redirect('/restaurant/' + review.establishment.name + "/" + req.body.page);
            }else{
                console.log('review not found');
            }
            
        }).catch(errorFn);
        
    }).catch(errorFn);
    
});

server.get('/restaurant/:name', function(req, resp){
    const searchQuery = {name: req.params.name};
    const revSearch = {'establishment.name': req.params.name};

    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }

    establishmentModel.find(searchQuery).lean().then(function(establishment_data){
        reviewModel.find(revSearch).lean().then(function(review_data){
            var hasReviews = true;
            var hasNext = false;
            if(review_data.length == 0){
                hasReviews = false;
            }

            const sortedRev = helpfulSort(review_data);
            const setRev = sortedRev.splice(0,5);

            if(sortedRev.length>0){
                hasNext = true;
            }

            for(let i=0;i<setRev.length;i++){
                setRev[i].reviewNum = i+1;
            }
            //console.log(loggedUser.isOwner);
            resp.render('establishment-profile',{
                layout: 'index',
                title: 'Establishment',
                profile: true,
                'establishment-data': establishment_data,
                'review-data': setRev,
                login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
                loggedUser: name,
                hasReviews: hasReviews,
                isOwner: isOwner,
                hasPrev: false,
                hasNext: hasNext,
                nextNum: "page1"
            });
        }).catch(errorFn);
    }).catch(errorFn);
    
});

server.get('/restaurant/:name/page:num', function(req, resp){
    const searchQuery = {name: req.params.name};
    const revSearch = {'establishment.name': req.params.name};

    var isOwner;
    var name;
    if(req.session.login_user!=undefined){
        isOwner = req.session.login_user.isOwner;
        name = req.session.login_user.name;
    }
    //console.log(userprofile);
    establishmentModel.find(searchQuery).lean().then(function(establishment_data){
        reviewModel.find(revSearch).lean().then(function(review_data){
            var hasReviews = true;
            var hasNext = false;
            var prevNum;
            var page = Number(req.params.num);
            if(review_data.length == 0){
                hasReviews = false;
            }
            var numtemp = page + (5 * page) + 4;
            const sortedRev = helpfulSort(review_data);
            const temp = sortedRev.splice(0, numtemp);
            const setRev = temp.splice(page * 5,page + 5);

            //console.log(page);

            if(sortedRev.length>0){
                hasNext = true;
            }

            //console.log(review_data.length ==0);
            for(let i=0;i<setRev.length;i++){
                setRev[i].reviewNum = i+1;
            }

            if(page == 1){
                prevNum = "";
            }else{
                var n = page - 1;
                prevNum = "/page" + n; 
            }
            //console.log(prevNum);

            page++;

            resp.render('establishment-profile',{
                layout: 'index',
                title: 'Establishment',
                profile: true,
                'establishment-data': establishment_data,
                'review-data': setRev,
                login: req.session.login_user != undefined && req.session.login_user.isOwner == false,
                loggedUser: name,
                hasReviews: hasReviews,
                isOwner: isOwner,
                hasPrev: true,
                prevNum: prevNum,
                hasNext: hasNext,
                nextNum: "page" + page,
                currPage: "page" + req.params.num
            });
        }).catch(errorFn);
    }).catch(errorFn);
});

function finalClose(){
    console.log('Close connection at the end!');
    mongoose.connection.close();
    process.exit();
}

process.on('SIGTERM',finalClose);  
process.on('SIGINT',finalClose);   
process.on('SIGQUIT', finalClose); 

const port = process.env.PORT | 3000;
server.listen(port, function(){
    console.log('Listening at port '+port);
});
