﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Xunit.Extensions;

namespace TryRoslyn.Tests.Support {
    public class EmbeddedResourceDataAttribute : DataAttribute {
        private readonly Regex _resourceNameRegex;

        public EmbeddedResourceDataAttribute(string resourceNameRegex) {
            _resourceNameRegex = new Regex(resourceNameRegex);
        }

        public override IEnumerable<object[]> GetData(MethodInfo methodUnderTest, Type[] parameterTypes) {
            var assembly = Assembly.GetExecutingAssembly();
            var allResourceNames = assembly.GetManifestResourceNames();

            return from name in allResourceNames
                   where _resourceNameRegex.IsMatch(name)
                   select new object[] { name, ReadResource(assembly, name) };
        }

        private string ReadResource(Assembly assembly, string name) {
            // ReSharper disable once AssignNullToNotNullAttribute
            using (var stream = assembly.GetManifestResourceStream(name))
            using (var reader = new StreamReader(stream)) {
                return reader.ReadToEnd();
            }
        }
    }
}