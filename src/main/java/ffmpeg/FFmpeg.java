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
			final var verFileName = "ffmpeg.build.txt";
			final var exeName = JarLib.getOsSubDir().startsWith("win")
				? "ffmpeg.exe"
				: "ffmpeg";
			var localVer = JarLib.getLocal(verFileName);
			var remoteVer = JarLib.getUrl(new URL(baseUrl, verFileName));
			if (localVer != null) localVer = localVer.trim();
			if (remoteVer != null) remoteVer = remoteVer.trim();
			if (
				localVer == null || (remoteVer != null &&
				remoteVer.compareToIgnoreCase(localVer) != 0)
			) {
				// download ffmpeg from remoteVer
				JarLib.deleteLocal(verFileName);
				JarLib.deleteLocal(exeName);
			}
			final var archiveName = remoteVer != null && !remoteVer.isEmpty()
				? remoteVer
				: "ffmpeg.zip";
			exe = JarLib.loadFile(new URL(baseUrl, archiveName), exeName, true);
			exe.setExecutable(true, true);
			JarLib.loadFile(new URL(baseUrl, verFileName), verFileName, true);
		} catch (IOException e) {
			e.printStackTrace();
			throw new RuntimeException(e);
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
