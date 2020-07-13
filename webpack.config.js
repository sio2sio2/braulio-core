const webpack = require("webpack"),
      path = require("path"),
      merge = require("webpack-merge"),
      name = require("./package.json").name;


// Configuración para Babel
function confBabel(env) {
   return {
      module: {
         rules: [
            {
               test: /\.js$/,
               exclude: /node_modules/,
               use: {
                  loader: "babel-loader",
                  options: {
                     presets: [["@babel/env", {
                        debug: env.debug,
                        corejs: 3,
                        useBuiltIns: "usage"
                     }]]
                  }
               }
            },
         ]
      }
   }
}


// Configuración adicional para el sabor bundle,
// o sea, el que contiene todas las dependencias.
function confBundle() {
   return {
   }
}


// Configuración sin dependencias
function confNoDeps() {
   return {
      externals: {}
   }
} 


// Configuración para desarrollo
function confDev(filename) {
   return {
      devtool: false,
      plugins: [
         new webpack.SourceMapDevToolPlugin({
            filename: `${filename}.map`
         })
      ],
      devServer: {
         contentBase: path.resolve(__dirname, "examples"),
         publicPath: "/dist/",
         watchContentBase: true,
         open: "chromium",
      }
   }
}


module.exports = env => {
   let mode;
   switch(env.output) {
      case "debug":
      case "srcdebug":
         env.mode = "development";
         break;
      default:
         env.mode = "production";
   }

   // Nombre del resultado.
   let filename;
   switch(env.output) {
      case "min":
      case "debug":
         filename = "[name].js";
         break;
      case "src":
         filename = "[name]-src.js";
         break
      case "srcdebug":
         filename = "[name]-debug.js";
         break;
      default:
         filename = `[name].${env.output}.js`;
   }

   const common = {
      mode: mode,
      entry: {
         [name]: "./src/index.js"
      },
      output: {
         filename: filename,
         libraryTarget: "umd",
         umdNamedDefine: true,
         library: "B",
         libraryExport: "default"
      },
      plugins: [
         new webpack.ProvidePlugin({
            gapi: "gapi-client"
         }),
         new webpack.DefinePlugin({
            "process.env.output": JSON.stringify(env.output),
            "process.env.version": JSON.stringify(env.version),
            "process.env.mode": JSON.stringify(env.mode)
         })
      ],
      externals: {
         "gapi-client": "gapi"
      }
   }

   return merge.smart(
      env.output === "bundle"?confBundle():confNoDeps(),
      common,
      env.mode === "production"?confBabel(env):confDev(filename),
      env.output === "src"?{optimization: {minimize: false}}:null,
   );
}
