package ffmpeg.ui;

import javax.swing.JFrame;
import javax.swing.WindowConstants;

import img_applet.ImgApplet;

public class Application {

	public static void main(String[] args) {
        JFrame frame = new JFrame("img-applet");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        ImgApplet applet = new ImgApplet();
        frame.getContentPane().add(applet);
        applet.init();
        applet.start();
        frame.pack();
        frame.setResizable(false);
        frame.setVisible(true);
	}

}
