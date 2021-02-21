package ffmpeg;

import img_applet.JarLib;

import java.io.File;
import java.io.IOException;
import java.net.URL;

public class FFmpeg {
	
	public static File exe;
	
	public static void load(URL baseUrl) {
		try {
			baseUrl = new URL(baseUrl, JarLib.getOsSubDir() + "/");
			final String verFileName = "ffmpeg.build.txt";
			final String exeName = JarLib.getOsSubDir()
					.startsWith("win") ? "ffmpeg.exe" : "ffmpeg";
			String localVer = JarLib.getLocal(verFileName), remoteVer = null;
			if (localVer != null)
				remoteVer = JarLib.getUrl(new URL(baseUrl, verFileName));
			if (localVer == null || remoteVer.compareToIgnoreCase(localVer) != 0) {
				JarLib.deleteLocal(verFileName);
				JarLib.deleteLocal(exeName);
			}
			exe = JarLib.loadFile(new URL(baseUrl, "ffmpeg.zip"), exeName, true);
			exe.setExecutable(true, true);
			JarLib.loadFile(new URL(baseUrl, verFileName), verFileName, true);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
//	static {
//		// win : load file 'ffmpeg.exe'
//		try {
//			exe = JarLib.loadFile(FFmpeg.class, "ffmpeg.exe", true);
//		} catch (UnsatisfiedLinkError | IOException e) {
//			e.printStackTrace();
//		}
//	}
}
