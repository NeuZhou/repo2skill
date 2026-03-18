/**
 * Tests for C# .csproj support in analyzer
 */

import { describe, it, expect } from "vitest";
import { analyzeRepo } from "../analyzer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("C# .csproj support", () => {
  let tmpDir: string;

  function setup(files: Record<string, string>) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "csproj-test-"));
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tmpDir, name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
  }

  function cleanup() {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it("detects C# language from .csproj file", async () => {
    setup({
      "MyProject.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="Serilog" Version="3.1.0" />
  </ItemGroup>
</Project>`,
      "Program.cs": `using System;\nclass Program { static void Main() { Console.WriteLine("Hello"); } }`
    });

    try {
      const result = await analyzeRepo(tmpDir, "myproject");
      expect(result.languages).toContain("C#");
      expect(result.dependencies).toContain("Newtonsoft.Json");
      expect(result.dependencies).toContain("Serilog");
    } finally {
      cleanup();
    }
  });

  it("extracts description from .csproj PropertyGroup", async () => {
    setup({
      "MyLib.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Description>A fantastic C# library</Description>
    <PackageId>MyLib</PackageId>
    <Version>2.0.0</Version>
  </PropertyGroup>
</Project>`,
      "Class1.cs": `namespace MyLib { public class Class1 {} }`
    });

    try {
      const result = await analyzeRepo(tmpDir, "mylib");
      expect(result.description).toContain("fantastic C# library");
      expect(result.packageName).toBe("MyLib");
    } finally {
      cleanup();
    }
  });

  it("detects OutputType=Exe as a CLI command", async () => {
    setup({
      "MyCli.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <AssemblyName>mycli</AssemblyName>
  </PropertyGroup>
</Project>`,
      "Program.cs": `class Program { static void Main() {} }`
    });

    try {
      const result = await analyzeRepo(tmpDir, "mycli");
      expect(result.cliCommands.length).toBeGreaterThanOrEqual(1);
      expect(result.cliCommands.some(c => c.name === "mycli")).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("generates install instructions with dotnet add package", async () => {
    setup({
      "MyLib.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <PackageId>MyLib</PackageId>
  </PropertyGroup>
</Project>`,
      "Class1.cs": `namespace MyLib { public class Class1 {} }`
    });

    try {
      const result = await analyzeRepo(tmpDir, "mylib");
      expect(result.installInstructions).toContain("dotnet");
    } finally {
      cleanup();
    }
  });
});
