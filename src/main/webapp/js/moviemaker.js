(function () {
    var MM = angular.module('moviemaker', ['login-ui', 'ngResource']);

    MM.controller('MovieMakerCtrl', function ($scope, $http, $routeParams, $resource) {
        var Project = $resource('rest/mm/project/:projectId', { projectId: '@projectId' });

        $scope.projectId = $routeParams.projectId;
        if ($scope.projectId == undefined) {
            throw "Project not passed to page!";
        }

        var streaming = false,
            video = document.querySelector('#video'),
            canvas = document.querySelector('#canvas'),
            width = 640,
            height = 0;

        var index = 0;
        var interval = 200;
        $scope.mode = 'grid';
        $scope.onionEnabled = true;

        $scope.project = Project.get({projectId: $scope.projectId});
//        var snaps = $scope.project.frames || [];
        console.log($scope.project);

        navigator.getMedia = ( navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

//        preview.addEvent("error", function() {
//            $scope.errorMessage="There was a video error";
//        });

        navigator.getMedia(
            {
                video: true,
                audio: false
            },
            function (stream) {
                if (navigator.mozGetUserMedia) {
                    video.mozSrcObject = stream;
                } else {
                    var vendorURL = window.URL || window.webkitURL;
                    video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
                }
                video.play();
            },
            function (err) {
                console.log("An error occured! " + err);
            }
        );

        video.addEventListener('canplay', function (ev) {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);
                console.log("height of video is: " + height);
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                streaming = true;
            }
        }, false);

        $scope.toggleOnion = function () {
            $scope.onionEnabled = !$scope.onionEnabled;
        }

        $scope.snap = function () {
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
            var data = canvas.toDataURL('image/jpeg');
            post(data);
//            photo.setAttribute('src', data);
        }

        $scope.keydown = function ($event) {
            if ($event.keyCode == 32) {
                $scope.snap();
                $event.stopPropagation();
                $event.preventDefault();
            }
        }

        var post = function (data) {
            var header = "data:image/jpeg;base64";
            if (data.indexOf(header) != 0) {
                throw "expected '" + header + "' at start of data";
            }
            var base64data = data.substr(header.length + 1);

            $http.post('/rest/mm/post/' + $scope.projectId, base64data, {
                headers: { 'Content-Type': "text/plain" },
                transformRequest: angular.identity
            }).success(function (result) {
                    console.log("posted! " + result);
                    $scope.project.frames.push(result);
//                    $scope.uploadedImgSrc = result.src;
//                    $scope.sizeInBytes = result.size;
                }).error(function (result) {
                    console.log("error with post!");
                    $scope.errorMessage = result;
                });

        };
    });

    MM.controller('ProjectsCtrl', function ($scope, $rootScope, $http, $resource, $window, accountService) {
        var Project = $resource('rest/mm/project/:projectId', { projectId: '@projectId' });
        var ProjectList = $resource('rest/mm/project/list');

        function refreshProjects() {
            ProjectList.query(function (list) {
                $scope.projects = list;
            });
        }

        $rootScope.$watch('controllers', function () {
            if ($rootScope.controllers && $rootScope.controllers.length == 1) {
                refreshProjects();
            }
        });

        $scope.moment = function(d) {
            return moment(d).fromNow();
        };

        $scope.createProject = function () {
            console.log("new project");
            var project = new Project();
            project.name = $scope.newProjectName;
            project.$save(function () {
                refreshProjects();
            });
        }
    });

    MM.controller('WelcomeCtrl', function ($scope) {
        $scope.doit = function () {
            alert("done");
        }
    });

    MM.config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/welcome', {templateUrl: 'partials/welcome.html', controller: 'WelcomeCtrl'})
            .when('/projects', {templateUrl: 'partials/projects.html', controller: 'ProjectsCtrl'})
            .when('/project/:projectId', {templateUrl: 'partials/editor.html', controller: 'MovieMakerCtrl'})
            .otherwise({redirectTo: '/welcome'})
    }]);

    MM.factory('accountService', function () {
        var accountInfo = {};
        return accountInfo;
    })

    MM.directive('navbar', function () {
        return {
            restrict: 'A',
            replace: true,
            scope: { },
            templateUrl: 'partials/navbar.html',
            controller: function($scope, $http, $resource, accountService) {
                var Account = $resource('rest/mm/account');

                // init the account (if logged in)
                accountService.account = Account.get();

                $scope.$on('event:auth-loginConfirmed', function (event, data) {
                    console.log("login confirmed...");
                    accountService.account=data;
                });

                $scope.logout = function () {
                    $http.post('rest/mm/logout').success(function (result) {
                        accountService.account = undefined;
                        $window.location.reload();
                    });
                };

                $scope.accountService=accountService;
            }
        };
    });
})();