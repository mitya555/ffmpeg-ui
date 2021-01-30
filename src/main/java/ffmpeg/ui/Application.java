package ffmpeg.ui;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.util.logging.LogManager;
import java.util.logging.Logger;

import javax.swing.JFrame;
import javax.swing.SwingUtilities;

import img_applet.ImgApplet;
import javafx.application.Platform;
import javafx.embed.swing.JFXPanel;
import javafx.geometry.HPos;
import javafx.geometry.VPos;
import javafx.scene.Group;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;

public class Application {

	static Logger logger = Logger.getLogger(Application.class.getName());

    private static void initAndShowGUI() {
	    // This method is invoked on the EDT thread
	    JFrame frame = new JFrame("Swing and JavaFX");
	    final JFXPanel fxPanel = new JFXPanel();
	    frame.add(fxPanel);
	    frame.setSize(750, 500);
	    frame.setVisible(true);
	    frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
	    Platform.runLater(() -> initFX(fxPanel));
    }
    private static void initFX(JFXPanel fxPanel) {
	    // This method is invoked on the JavaFX thread
	    Scene scene = createScene();
	    fxPanel.setScene(scene);
    }
    private static Scene createScene() {
//	    Group root = new Group();
//	    Scene scene = new Scene(root, Color.ALICEBLUE);
//	    Text text = new Text();
//	    text.setX(40);
//	    text.setY(100);
//	    text.setFont(new Font(25));
//	    text.setText("Welcome JavaFX!");
//	    root.getChildren().add(text);
//	    return (scene);
    	return new Scene(new Browser(),750,500, Color.web("#666970"));
    }

    public static void main(String[] args) throws URISyntaxException {
//        JFrame frame = new JFrame("img-applet");
//        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
//        ImgApplet applet = new ImgApplet();
//        frame.getContentPane().add(applet);
//        applet.init();
//        applet.start();
//        frame.pack();
//        frame.setResizable(false);
//        frame.setVisible(true);

    	logger.info("Starting Application...");
  
    	var classLoader = Application.class.getClassLoader();
    	if (new File(classLoader.getResource("logging.properties").toURI()).exists()) {
	    	try (var loggingProperties = classLoader.getResourceAsStream("logging.properties")) {
			    LogManager.getLogManager().updateConfiguration(loggingProperties, null);
			} catch (IOException e) {
				e.printStackTrace();
			}
    	}
    	SwingUtilities.invokeLater(Application::initAndShowGUI);
    }
}

class Browser extends Region {
	 
    final WebView browser = new WebView();
    final WebEngine webEngine = browser.getEngine();
     
    public Browser() {
        //apply the styles
        getStyleClass().add("browser");
        // load the web page
//        webEngine.load("http://www.google.com/");
//        webEngine.load("/imgplay2-.htm");
        webEngine.load(getClass().getClassLoader().getResource("imgplay2-.htm").toString());
        //add the web view to the scene
        getChildren().add(browser);
 
    }
    private Node createSpacer() {
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        return spacer;
    }
 
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