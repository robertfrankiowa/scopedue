"""Kept for older notes that say `python3 i18n/build.py`: the build now lives in build.py at the top of the release folder."""
import os, runpy
runpy.run_path(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'build.py'), run_name='__main__')
