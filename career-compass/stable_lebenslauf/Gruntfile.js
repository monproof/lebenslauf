module.exports = function(grunt) {

    // 1. Configuration des tâches
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // Exemple de tâche : Minification du CSS pour ton CV
        cssmin: {
            target: {
                files: {
                    'dist/css/style.min.css': ['css/style.css'] // Adapte les chemins selon ton projet
                }
            }
        }
    });

    // 2. Chargement des plugins (assure-toi qu'ils sont installés via npm)
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    // 3. ENREGISTREMENT DES TÂCHES (C'est ici que ça bloquait)
    
    // Cette ligne définit ce qui se passe quand tu tapes "grunt build"
    grunt.registerTask('build', ['cssmin']); 
    
    // Cette ligne définit ce qui se passe quand tu tapes juste "grunt"
    grunt.registerTask('default', ['build']);

};