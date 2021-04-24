package ffmpeg.ui;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Map;
import java.util.Properties;
import java.util.logging.LogManager;
import java.util.logging.Logger;

import javax.swing.JFrame;
import javax.swing.SwingUtilities;

import img_applet.JarLib;
import javafx.application.Platform;
import javafx.embed.swing.JFXPanel;
import javafx.scene.Scene;
import javafx.scene.paint.Color;

public class Application {

    static Logger logger = Logger.getLogger(Application.class.getName());

    public static Browser browser;

    public static Properties properties;

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
//        Group root = new Group();
//        Scene scene = new Scene(root, Color.ALICEBLUE);
//        Text text = new Text();
//        text.setX(40);
//        text.setY(100);
//        text.setFont(new Font(25));
//        text.setText("Welcome JavaFX!");
//        root.getChildren().add(text);
//        return (scene);
        browser = new Browser(
                properties.getProperty("url.base.ffmpegexe", "http://localhost:8080/ffmpeg/"),
                properties.getProperty("url.base.rtmp", "rtmp://localhost/"),
                properties.getProperty("url.base.http", "http://localhost:8080/"),
                "debug-java&debug-ffmpeg&debug-js&os-name=" + JarLib.getOsName(), // ""
                Map.of("debug", "yes")
            );
        return new Scene(browser, 750, 500, Color.web("#666970"));
    }

    private static void consumeResource(ClassLoader classLoader, String resourceName, _Consumer consumer) {
        try {
            URL url = classLoader.getResource(resourceName);
            if (url != null && new File(url.toURI()).exists()) {
                try (var inputStream = classLoader.getResourceAsStream(resourceName)) {
                    consumer.consume(inputStream);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        } catch (URISyntaxException e) {
            e.printStackTrace();
        }
    }

    private static void consumeResource(String uri, String resourceName, _Consumer consumer) {
        URLClassLoader ucl = null;
        try {
            ucl = new URLClassLoader(new URL[] { new URI(uri).toURL() });
        } catch (MalformedURLException | URISyntaxException e) {
            e.printStackTrace();
        }
        if (ucl != null) consumeResource(ucl, resourceName, consumer);
    }

    private interface _Consumer {
        void consume(InputStream inputStream) throws IOException;
    }

    public static void main(String[] args) {
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

        consumeResource(classLoader, "logging.properties",
                inputStream -> LogManager.getLogManager().updateConfiguration(inputStream, null));

        properties = new Properties();
        consumeResource(classLoader, "internal.properties", properties::load);
        consumeResource(classLoader, "application.properties", properties::load);
        consumeResource("file:///~/.ffmpegui/", "application.properties", properties::load);

        SwingUtilities.invokeLater(Application::initAndShowGUI);
    }
}