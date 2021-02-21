package ffmpeg.ui;

import java.util.Map;

import img_applet.ImgApplet;
import javafx.application.Platform;
import javafx.concurrent.Worker.State;
import javafx.geometry.HPos;
import javafx.geometry.VPos;
//import javafx.scene.Node;
//import javafx.scene.layout.HBox;
//import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import netscape.javascript.JSObject;

public class Browser extends Region {
    
   final WebView browser = new WebView();
   final WebEngine engine = browser.getEngine();
   final ImgApplet applet;

   public JSObject getWindow() {
       return (JSObject) engine.executeScript("window");
   }
   
   public void jsCall(String methodName, Object... args) {
       Platform.runLater(() -> getWindow().call(methodName, args));
   }

   public Browser(String ffmpegExeBaseUrl, String rtmpBaseUrl, String httpBaseUrl,
           String queryString, Map<String,String> params) {

       // apply the styles
       getStyleClass().add("browser");
       // create & initialize ImgApplet
       applet = new ImgApplet(ffmpegExeBaseUrl, params);
       applet.init();
       engine.getLoadWorker().stateProperty().addListener((ov, oldState, newState) -> {
           if (newState == State.SUCCEEDED) {
               JSObject window = getWindow();
               window.call("onLoadHandler", applet);
           }
       });
       // load the web page
//       webEngine.load("http://www.google.com/");
//       webEngine.load("/imgplay2-.htm");
       engine.load(getClass().getClassLoader().getResource("imgplay2-.htm").toString() +
               (queryString == null || queryString.trim().length() == 0
               ? "" : "?" + queryString) + "#" + rtmpBaseUrl + "#" + httpBaseUrl);
       //add the web view to the scene
       getChildren().add(browser);
   }

//   private Node createSpacer() {
//       Region spacer = new Region();
//       HBox.setHgrow(spacer, Priority.ALWAYS);
//       return spacer;
//   }

   @Override protected void layoutChildren() {
       double w = getWidth();
       double h = getHeight();
       layoutInArea(browser,0,0,w,h,0, HPos.CENTER, VPos.CENTER);
   }

   @Override protected double computePrefWidth(double height) {
       return 750;
   }

   @Override protected double computePrefHeight(double width) {
       return 500;
   }
}