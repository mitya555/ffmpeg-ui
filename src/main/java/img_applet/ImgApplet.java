package img_applet;

import ffmpeg.FFmpeg;
import img_applet.FFmpegProcess.TrackInfo;

//import java.awt.Button;
//import java.awt.Color;
//import java.awt.FlowLayout;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;
import java.util.Queue;
import java.util.regex.Pattern;

//import javax.swing.JPanel;
//import javax.swing.SwingUtilities;

import netscape.javascript.JSObject;

import static ffmpeg.ui.Application.browser;

//@SuppressWarnings("serial")
public class ImgApplet /* extends JPanel */ {

//	private Button createButton(String label, ActionListener click, boolean active) {
//		Button button = new Button(); 
//		getContentPane().add(button);
//		button.addActionListener(click);
//		button.setLabel(label);
//		button.setEnabled(active);
////		button.setVisible(active);
//		return button;
//	}

    private static boolean strEmpty(String str) { return str == null || str.length() == 0; }
	private static boolean isNo(String str) { return str == null || "No".equalsIgnoreCase(str) || "False".equalsIgnoreCase(str); }

    private boolean DEBUG = true;
    private void debug(String dbg) { if (DEBUG) System.out.println(dbg); }
    //private void debug(String dbg, String inf) { if (DEBUG) System.out.println(dbg); else System.out.println(inf); }

    private FFmpegProcess ffmpeg0;
    private Map<Integer,FFmpegProcess> ffmpegs = new HashMap<Integer,FFmpegProcess>();
    private Queue<Integer> id_pool = new ArrayDeque<Integer>();
    private int ffmpeg_count = 0;

	private Integer registerFFmpeg(FFmpegProcess ffmpeg, Map<String, String> params) {
		Integer id = null;
		if (ffmpeg.init(params).HasInput()) {
			Integer id_from_pool = id_pool.poll();
			id = id_from_pool != null ? id_from_pool : ++ffmpeg_count;
			ffmpegs.put(id, ffmpeg.setId(id));
			debug("Created FFmpeg ID: " + id);
		}
		return id;
	}
	
	public void removeFFmpegById(int id) {
		FFmpegProcess ffmpeg = ffmpegs.get(id);
		if (ffmpeg != null) {
			ffmpeg.stopPlayback();
			ffmpegs.remove(id);
			id_pool.add(id);
			debug("Removed FFmpeg ID: " + id);
		}
	}

	private Map<String, String> paramArrayToMap(JSObject jsArray) {
		final HashMap<String,String> params = new HashMap<String, String>();
		for (int i = 0; i < ((Integer) jsArray.getMember("length")) - 1; i += 2) {
			params.put((String) jsArray.getSlot(i), (String) jsArray.getSlot(i + 1));
		}
		return params;
	}
	
	public FFmpegProcess createFFmpeg(final String jsCallback, JSObject paramArray) {
		final Map<String, String> params = paramArrayToMap(paramArray);
//		return AccessController.doPrivileged(new PrivilegedAction<FFmpegProcess>() {
//			@Override
//			public FFmpegProcess run() {
				final FFmpegProcess ffmpeg = new FFmpegProcess();
				if (registerFFmpeg(ffmpeg, params) != null && !strEmpty(jsCallback)) {
					final String[] _jsCallback = jsCallback.split("[,;]");
					ffmpeg.eventHandler = (FFmpegProcess.Event arg) -> {
						boolean playing = FFmpegProcess.Event.START.equals(arg);
						for (String jsFunc : _jsCallback)
							browser.jsCall(jsFunc, new Object[] { ffmpeg, playing });
					};
				}
				return ffmpeg;
//			}
//		}); /* doPrivileged() */
	}
	
	public int createFFmpegId(final String jsCallback, JSObject paramArray) {
		final Map<String, String> params = paramArrayToMap(paramArray);
//		return AccessController.doPrivileged(new PrivilegedAction<FFmpegProcess>() {
//			@Override
//			public FFmpegProcess run() {
				final FFmpegProcess ffmpeg = new FFmpegProcess();
				final Integer res = registerFFmpeg(ffmpeg, params);
				if (res != null) {
					final int id = res;
					if (!strEmpty(jsCallback)) {
						final String[] _jsCallback = jsCallback.split("[,;]");
						ffmpeg.eventHandler = (FFmpegProcess.Event arg) -> {
							boolean playing = FFmpegProcess.Event.START.equals(arg);
							for (String jsFunc : _jsCallback)
								browser.jsCall(jsFunc, new Object[] { id, playing });
						};
					}
					return id;
				}
				return 0;
//			}
//		}); /* doPrivileged() */
	}

	public ImgApplet(String codeBaseUrl, Map<String, String> parameters) {
		try {
			_codeBaseUrl = new URL(codeBaseUrl);
		} catch (MalformedURLException e) {
			throw new RuntimeException(e);
		}
		_parameters = parameters;
	}
	private final URL _codeBaseUrl;
	private final Map<String, String> _parameters;
	public URL getCodeBase() { return _codeBaseUrl; }
	public String getParameter(String name) { return _parameters == null ? null : _parameters.get(name); }

	public void init() {
		
		FFmpeg.load(getCodeBase());
		
		DEBUG = !isNo(getParameter("debug"));
		
		try {
//			// Create defaultFFmpegProcess
//			//debug("Create default FFmpegProcess.");
//			ffmpeg0 = new FFmpegProcess();
//			if (registerFFmpeg(ffmpeg0, this, this) != null) {
//				final Button stopButton = createButton("Stop", e -> ffmpeg0.stopPlayback(), ffmpeg0.isPlaying());
//				final Button playButton = createButton("Play", e -> ffmpeg0.play(), !ffmpeg0.isPlaying());
//				ffmpeg0.eventHandler = (FFmpegProcess.Event arg) -> {
//					boolean playing = FFmpegProcess.Event.START.equals(arg);
//					stopButton.setEnabled(playing); /*stopButton.setVisible(playing);*/
//					playButton.setEnabled(!playing); /*startButton.setVisible(!playing);*/
//				};
//			}
	
			// Remove as many temp files as possible
			int _fnd = 0, _del = 0;
			for (File temp : JarLib.tmpdir.listFiles((dir, name) -> Pattern.matches("img_applet_\\d+\\.tmp", name))) {
				_fnd++;
				if (temp.delete()) _del++;;
			}
			debug("Temp files: found " + _fnd + "; deleted " + _del + " files");
		} catch (Throwable e) {
			e.printStackTrace();
		}
		
//		SwingUtilities.invokeLater(() -> {
//			FlowLayout cont = new FlowLayout(FlowLayout.CENTER, 10, 10);
//			getContentPane().setLayout(cont);			
//			getContentPane().setBackground(Color.WHITE);
//			debug("Initialized GUI");				
//		});
	}


	private void play(final FFmpegProcess ffmpeg) { AccessController.doPrivileged(new PrivilegedAction<Object>() { @Override public Object run() { ffmpeg.play(); return null; } }); }


	public void play(final int id) { play(ffmpegs.get(id)); }

	public void stopPlayback(int id) { ffmpegs.get(id).stopPlayback(); }

	public boolean isPlaying(int id) { return ffmpegs.get(id).isPlaying(); }

	public String getData(int id) throws IOException { byte[] res = ffmpegs.get(id).getData(); return res != null ? new String(res, "UTF-8") : null; }

	public String getDataURI(int id) throws IOException { return ffmpegs.get(id).getDataURI(); }

	public int getSN(int id) { return ffmpegs.get(id).getSN(); }

	int getQueueLength(int id) { return ffmpegs.get(id).getQueueLength(); }

	public boolean isStreaming(int id) { return ffmpegs.get(id).isStreaming(); }

	public String startHttpServer(int id) throws InterruptedException { return ffmpegs.get(id).startHttpServer(); } 

	public String getVideoDataURI(int id) throws IOException { return ffmpegs.get(id).getVideoDataURI(); }

	public int getVideoSN(int id) { return ffmpegs.get(id).getVideoSN(); }

	public int getVideoQueueLength(int id) { return ffmpegs.get(id).getVideoQueueLength(); }

	public long getVideoTimestamp(int id) { return ffmpegs.get(id).getVideoTimestamp(); }
	public long getVideoNextTimestamp(int id) { return ffmpegs.get(id).getVideoNextTimestamp(); }
	public void releaseCurrentBuffer(int id) throws IOException { ffmpegs.get(id).releaseCurrentBuffer(); }

	public TrackInfo getVideoTrackInfo(int id) { return ffmpegs.get(id).getVideoTrackInfo(); }

	public String getStderrData(int id) throws IOException { return ffmpegs.get(id).getStderrData(); }

	public void setFFmpegParam(int id, String name, String value) { ffmpegs.get(id).setFFmpegParam(name, value); }

	public void removeFFmpegParam(int id, String name) { ffmpegs.get(id).removeFFmpegParam(name); }


	public void play() { play(ffmpeg0); }

	public boolean isPlaying() { return ffmpeg0.isPlaying(); }

	public String getData() throws IOException { byte[] res = ffmpeg0.getData(); return res != null ? new String(res, "UTF-8") : null; }

	public String getDataURI() throws IOException { return ffmpeg0.getDataURI(); }

	public int getSN() { return ffmpeg0.getSN(); }

	int getQueueLength() { return ffmpeg0.getQueueLength(); }

	public boolean isStreaming() { return ffmpeg0.isStreaming(); }

	public String startHttpServer() throws InterruptedException { return ffmpeg0.startHttpServer(); } 

	public String getVideoDataURI() throws IOException { return ffmpeg0.getVideoDataURI(); }

	public int getVideoSN() { return ffmpeg0.getVideoSN(); }

	public int getVideoQueueLength() { return ffmpeg0.getVideoQueueLength(); }

	public long getVideoTimestamp() { return ffmpeg0.getVideoTimestamp(); }
	public long getVideoNextTimestamp() { return ffmpeg0.getVideoNextTimestamp(); }
	public void releaseCurrentBuffer() throws IOException { ffmpeg0.releaseCurrentBuffer(); }

	public TrackInfo getVideoTrackInfo() { return ffmpeg0.getVideoTrackInfo(); }

	public String getStderrData() throws IOException { return ffmpeg0.getStderrData(); }

	public void setFFmpegParam(String name, String value) { ffmpeg0.setFFmpegParam(name, value); }

	public void removeFFmpegParam(String name) { ffmpeg0.removeFFmpegParam(name); }


	public boolean isDebug() { return DEBUG; }


	public void stop() {
		for (FFmpegProcess ffmpeg : ffmpegs.values())
			ffmpeg./*stopPlayback*/kill();		
	}

	public void destroy() {
		for (FFmpegProcess ffmpeg : ffmpegs.values())
			ffmpeg.kill();
	}
}
