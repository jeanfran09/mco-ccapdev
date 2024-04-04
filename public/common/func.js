$(document).ready(function(){

    $('#edit-user').click(function(){
        document.getElementById("media").value = document.getElementById("pfp").getAttribute('src');
        document.getElementById("username").value = document.getElementById("name").innerHTML.removeCharAt(0);
        document.getElementById("bio").value = document.getElementById("shortdesc").innerHTML;
        //alert("test");
    });

    $('#search').click(function(){
        //alert('Changed!')
        const isWhitespaceString = str => !/\S/.test(str);
        var string = $('#search-input').val();
        if(isWhitespaceString(string)){
            return false;
        }
    });

    

    for(let i=1; i<=10; i++){
        $("#more"+i).click(function(){
            var mydiv = document.getElementById("review"+i);
            mydiv.style.overflow = "visible"; 
            mydiv.style.height = "auto";
            document.getElementById("more"+i).style.display = "none";
        });

        if(document.getElementById("review"+i).scrollHeight<=50){
            document.getElementById("more"+i).style.display = "none";
            document.getElementById("review"+i).style.height = document.getElementById("review"+i).scrollHeight;
        }else{
            document.getElementById("review"+i).style.overflow = "hidden";
            document.getElementById("review"+i).style.height = "50px";
        }

        $('#helpful'+i).click(function() {
            
            var helpful = document.getElementById('helpful'+i);
            var nothelpful = document.getElementById('nothelpful'+i);
            var selectHelp = helpful.classList.contains("btn-outline-success");
            var selectNot = nothelpful.classList.contains("btn-success");

            $.ajax({
                type: 'POST', 
                url: "/helpful", 
                data: { id: $('#num' + i).val(), selectHelp: selectHelp, selectNot: selectNot}, 
                success: function(data,result){
                    //alert(data.alert);
                    if(String(data.alert) == "true"){
                        alert("Logged user accounts are required to rate review");
                    }else if(selectHelp){
                        helpful.innerHTML = "Helpful " + data.h;
                        $('#helpful'+i).removeClass("btn-outline-success").addClass("btn-success");
                        if(selectNot){
                            nothelpful.innerHTML = "Not Helpful " + data.n;
                        }
                        $('#nothelpful'+i).removeClass("btn-success").addClass("btn-outline-success");
                    }else{
                        helpful.innerHTML = "Helpful " + data.h;
                        $('#helpful'+i).removeClass("btn-success").addClass("btn-outline-success");
                    }
                    //alert(data.review._id);
                },error: function (jqXhr, textStatus, errorMessage) {
                    alert(errorMessage);
            }});
            //alert("click");
            /*$.post('helpful',{ id: $('#num' + i).val() },
                function(data, status){
                    if(status === 'success'){
                        alert(data.review);
                    }else{
                        alert(status);
                    }//if
            });//fn+post*/
            
            //alert("c");
        });
        
        $('#nothelpful'+i).click(function() {
            
            var nothelpful = document.getElementById('nothelpful'+i);
            var helpful = document.getElementById('helpful'+i);
            var selectHelp = helpful.classList.contains("btn-success");
            var selectNot = nothelpful.classList.contains("btn-outline-success");
            
            $.ajax({
                type: 'POST', 
                url: "/not-helpful", 
                data: { id: $('#num' + i).val(), selectHelp: selectHelp, selectNot: selectNot}, 
                success: function(data,result){
                    //alert(data.alert);
                    if(String(data.alert) == "true"){
                        alert("Logged user accounts are required to rate review");
                    }else if(selectNot){
                        nothelpful.innerHTML = "Not Helpful " + data.n;
                        $('#nothelpful'+i).removeClass("btn-outline-success").addClass("btn-success");
                        if(selectHelp){
                            helpful.innerHTML = "Helpful " + data.h;
                        }
                        $('#helpful'+i).removeClass("btn-success").addClass("btn-outline-success");
                    }else{
                        nothelpful.innerHTML = "Not Helpful " + data.n;
                        $('#nothelpful'+i).removeClass("btn-success").addClass("btn-outline-success");
                    }
                    //alert(data.review._id);
                },error: function (jqXhr, textStatus, errorMessage) {
                    alert(errorMessage);
            }});
        });
    }//end for


});

//https://jsfiddle.net/4p57wx8r/ ---- reference for making photos larger when clicked

// ASK SIR IF ASSUME THAT ALL USERNAMES ARE UNIQUE
//should est owners be given the option to edit the establishment info they own
//is it required to have a filter for sorting search results

//do username validation in edit profile (test)
//finish sessions
//make confirmation modal for deleting reviews and replies

