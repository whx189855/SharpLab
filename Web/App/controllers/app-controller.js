﻿angular.module('app').controller('AppController', ['$scope', '$filter', '$timeout', 'DefaultCodeService', 'UrlService', 'CompilationService', function ($scope, $filter, $timeout, defaultCodeService, urlService, compilationService) {
    'use strict';

    (function setupLanguages() {
        var csharp = { language: 'csharp', displayName: 'C#' };
        var vbnet  = { language: 'vbnet',  displayName: 'VB.NET' };
        var il     = { language: 'il',     displayName: 'IL' };

        $scope.languages = Object.freeze([csharp, vbnet]);
        $scope.targets = Object.freeze([csharp, vbnet, il]);

        $scope.codeMirrorModes = Object.freeze({
            csharp: 'text/x-csharp',
            vbnet:  'text/x-vb',
            il:     ''
        });
    })();

    $scope.branch = null;
    var branchesPromise = compilationService.getBranches().then(function(value) {
        $scope.branches = value;
        $scope.branches.forEach(function(b) {
            b.lastCommitDate = new Date(b.lastCommitDate);
        });
    });
    $scope.displayBranch = function(branch) {
        return branch.name + " (" + $filter('date')(branch.lastCommitDate, "d MMM") + ")";
    };

    setup();
    $scope.expanded = {};
    $scope.expanded = function(name) {
        $scope.expanded[name] = true;
    }
    $scope.toggle = function(name) {
        $scope.expanded[name] = !$scope.expanded[name];
    };

    function setup() {
        var urlData = urlService.loadFromUrl();
        if (urlData) {
            $scope.code = urlData.code;
            $scope.options = urlData.options;
            branchesPromise.then(function() {
                $scope.branch = $scope.branches.filter(function(b) { return b.name === urlData.branch; })[0] || null;
            });
        }
    
        $scope.options = angular.extend({
            language: 'csharp',
            target:   'csharp',
            mode:     'regular',
            optimizations: false
        }, $scope.options);
        defaultCodeService.attach($scope);

        var saveScopeToUrlThrottled = $.debounce(100, saveScopeToUrl);
        var updateFromServerThrottled = $.debounce(600, processOnServer);
        $scope.$watch('code', ifChanged(function() {
            saveScopeToUrlThrottled();
            updateFromServerThrottled();
        }));

        var updateImmediate = ifChanged(function() {
            saveScopeToUrl();
            processOnServer();
        });
        $scope.$watch('branch', updateImmediate);
        for (var key in $scope.options) {
            if (key.indexOf('$') > -1)
                continue;

            $scope.$watch('options.' + key, updateImmediate);
        }

        if (!urlData || !urlData.branch /* otherwise this would be called automatically when branches are loaded */) {
            $timeout(function() {
                processOnServer();
            });
        }
    }

    function ifChanged(f) {
        return function(newValue, oldValue) {
            if (oldValue === newValue) // initial angular call?
                return;

            return f(newValue, oldValue);
        }
    }
    
    function saveScopeToUrl() {
        urlService.saveToUrl({
            code: $scope.code,
            options: $scope.options,
            branch: ($scope.branch || {}).name
        });
    }

    $scope.loading = false;
    function processOnServer() {
        if ($scope.code == undefined || $scope.code === '')
            return;

        if ($scope.loading)
            return;

        $scope.loading = true;
        compilationService.process($scope.code, $scope.options, ($scope.branch || {}).name).then(function (data) {
            $scope.loading = false;
            $scope.result = data;
        }, function(response) {
            $scope.loading = false;
            var error = response.data;
            var report = error.exceptionMessage || error.message;
            if (error.stackTrace)
                report += "\r\n" + error.stackTrace;

            $scope.result = {
                success: false,
                errors: [ report ]
            };
        });
    }
}]);