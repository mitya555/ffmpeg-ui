package img_applet;

import java.io.*;
import java.net.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class JarLib{

  static public boolean loadLib(Class<?> cl, String libname, boolean shared){
    try{
      loadLibX(cl, libname, shared);
      return true;
    }catch(Exception e){
      System.out.println("JarLib.loadLib\n\tException = "+e.getMessage());
      System.err.println("JarLib.loadLib\n\tException = "+e.getMessage());
      e.printStackTrace();
    }catch(Error e){
      System.out.println("JarLib.loadLib\n\tError = "+e);
      System.err.println("JarLib.loadLib\n\tError = "+e);
      e.printStackTrace();
    }
    try{                                    // Shouldn't really need to load from system defaults anymore
      System.loadLibrary(libname);
      System.out.println("JarLib.loadLib: Successfully loaded library ["+libname+"] from some default system folder");
      return true;
    }catch(Exception e){
      System.out.println("JarLib.loadLib\n\tException = "+e.getMessage());
      System.err.println("JarLib.loadLib\n\tException = "+e.getMessage());
    }catch(Error e){
      System.out.println("JarLib.loadLib\n\tError = "+e);
      System.err.println("JarLib.loadLib\n\tError = "+e);
      e.printStackTrace();
    }
    return false;
  }

  static private void loadLibX(Class<?> cl, String name, boolean shared)throws IOException, UnsatisfiedLinkError{
    String libname=System.mapLibraryName(name);
    URL url = cl.getResource(JarLib.getOsSubDir()+"/"+libname);
    if(url==null){ 
      throw new UnsatisfiedLinkError(JarLib.class.getName()+".loadLibX: Could not find library ["+libname+"]");
    }
    System.load(getFile(url, libname, shared).getAbsolutePath());
    System.out.println("JarLib.loadLib: Successfully loaded library ["+url+"]");
  }

  static public File loadFile(Class<?> cl, String name, boolean shared)throws IOException, UnsatisfiedLinkError{
    URL url = cl.getResource(JarLib.getOsSubDir()+"/"+name);
    if(url==null){ 
      throw new UnsatisfiedLinkError(JarLib.class.getName()+".loadFile: Could not find file ["+name+"]");
    }
    return loadFile(url, name, shared);
  }

  static public File loadFile(URL url, String name, boolean shared)throws IOException, UnsatisfiedLinkError{
    File tmp = getFile(url, name, shared);
    System.out.println("JarLib.loadFile: Successfully loaded file ["+url+"]");
    return tmp;
  }

  static final File tmpdir = new File(System.getProperty("java.io.tmpdir"),"img_applet");
  
  static private File getFile(URL url, String filename, boolean shared)throws IOException, UnsatisfiedLinkError{
    try{
      URI uri = new URI(url.toString());    
      String scheme = uri.getScheme();
      if(scheme.equals("file")){                                  // if on local file system use this copy
        System.load(new File(uri).getAbsolutePath());
        System.out.println("JarLib.getFile: Successfully loaded file ["+url+"] from standard file location");
        return new File(uri);
      }else if( scheme.equals("jar")                              // make copy in tmp folder on local file system
            ||  scheme.equals("nbjcl")                            // netbeans: 2009-03-05 jmrunge
            ||  scheme.equals("http")
        ){
        File   dir    = tmpdir;
        dir.mkdirs();
        File   tmp;
        if (shared) {
          tmp    = new File(dir, "img_applet_" + filename);
          tmp.createNewFile();
        }else{
          File[] files=dir.listFiles();
          for(int i=0;i<files.length;i++){                          // delete all unused library copies
            if(files[i].getName().endsWith(filename)){              // if library is still needed we won't be able to delete it
              files[i].delete();                     
            }
          }
          tmp    = File.createTempFile("img_applet_",filename,dir);  // System.out.println(tmp.getAbsolutePath());
          tmp.deleteOnExit();
        }
        System.out.println("JarLib.getFile: Jar file location: " + tmp.getAbsolutePath());  
        if (tmp.length() == 0L)
          JarLib.extract(tmp,url,filename);
        System.out.println("JarLib.getFile: Successfully loaded file ["+url+"] from jar file location");  
        return tmp;
      }else{
        throw new UnsatisfiedLinkError(JarLib.class.getName()+".getFile:\n\tUnknown URI-Scheme ["+scheme+"]; Could not load file ["+uri+"]");
      }
    }catch(URISyntaxException urise){
      throw new UnsatisfiedLinkError(JarLib.class.getName()+".getFile:\n\tURI-Syntax Exception; Could not load file ["+url+"]");
    }
  }

  static private String getExtension(String path) {
    try {
      return path.substring(path.lastIndexOf(".") + 1);
    } catch (Exception e) {
      return "";
    }
  }
  
  static private void copyStream(OutputStream out, InputStream in) throws IOException {
    byte[] buffer=new byte[4096];
    int count=0;
    while((count=in.read(buffer))>0){
      out.write(buffer,0,count);
    }
  }
  
  static private void extract(OutputStream out, URL url, String filename)throws IOException{
    try (InputStream      in  = url.openStream()) {
      if ("zip".equalsIgnoreCase(getExtension(url.getPath()))) {
        try (ZipInputStream zip = new ZipInputStream(in)) {
          ZipEntry entry;
          while((entry = zip.getNextEntry())!=null) {
            // if (entry.getName().equalsIgnoreCase(filename)) {
            if (!entry.isDirectory()) {
              copyStream(out, zip);
              break;
            }
          }
        }
      } else {
        copyStream(out, in);
      }
    }
  }
  
  static private void extract(OutputStream out, URL url)throws IOException{
    try (InputStream      in  = url.openStream()) {
      copyStream(out, in);
    }
  }

  static private void extract(File fn, URL url, String filename)throws IOException{
    try (FileOutputStream out = new FileOutputStream(fn)) {
      extract(out, url, filename);
    }
  }

//  static private void extract(File fn, URL url)throws IOException{
//    try (FileOutputStream out = new FileOutputStream(fn)) {
//      extract(out, url);
//    }
//  }

  static final String charset = "UTF-8"; // "US-ASCII"
  
  static public String getUrl(URL url)throws IOException{
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      extract(out, url);
      return out.toString(charset);
    }
  }

  static public String getLocal(String filename)throws IOException{
    File file = new File(tmpdir, "img_applet_" + filename);
    if (!file.exists())
      return null;
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      extract(out, file.toURI().toURL());
      return out.toString(charset);
    }
  }
  
  static public boolean deleteLocal(String filename) { return new File(tmpdir, "img_applet_" + filename).delete(); }

  static public String getOsSubDir(){              // This is where I put my stuff

//    System.err.println("java.library.path = "+System.getProperty("java.library.path"));
//    System.err.println("os.name = "+System.getProperty("os.name"));
//    System.err.println("os.arch = "+System.getProperty("os.arch"));

    String osname=System.getProperty("os.name");

    if(osname.startsWith("Linux")){
      String osarch=System.getProperty("os.arch");
      if(osarch.endsWith("64")){                    // amd64
        return "lin64";
      }else{                                        // x86
        return "lin32";
      }
    }
    if(osname.startsWith("Windows")){
      String osarch=System.getProperty("os.arch");  // System.err.println("osarch = "+osarch);
      if(osarch.endsWith("64")){                    // amd64
        return "win64";
      }else{                                        // x86
        return "win32";
      }
    }
    if(osname.startsWith("Mac")){ return "mac";}
    return "";
  }

  static public String getOsName() {
    return getOsSubDir().substring(0, 3);
  }
}
