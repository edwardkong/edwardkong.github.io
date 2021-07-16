document.addEventListener('DOMContentLoaded',function(event){
  var dataText = [ "I'm Edward.", "Developer, Data Engineer, Designer."];
  // type one text in the typwriter
  // keeps calling itself until the text is finished
  function typeWriter(text, i, fnCallback) {
    // chekc if text isn't finished yet
    if (i < (text.length)) {
      // add next character to h1
      document.getElementById("writer").innerHTML += text.charAt(i);

      // wait for a while and call this function again for next character
      setTimeout(function() {
        typeWriter(text, i + 1, fnCallback)
      }, 50);
    }
    // text finished, call callback if there is a callback function
    else if (typeof fnCallback == 'function') {
      // call callback after timeout
      setTimeout(fnCallback, 500);
    }
  }
  // start a typewriter animation for a text in the dataText array
   function StartTextAnimation(i) {

     // check if dataText[i] exists
    if (i < dataText[i].length) {
      // text exists! start typewriter animation
     typeWriter(dataText[i], 0, function(){
       // after callback (and whole text has been animated), start next text
       document.getElementById("writer").innerHTML += '<br>';
       StartTextAnimation(i + 1);
     });
    }
  }
  // start the text animation
  StartTextAnimation(0);
});
