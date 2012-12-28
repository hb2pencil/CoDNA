import urllib, code, json, time, codecs, sqlite3, sys

# Set up a User Agent string for our bot
class MWURLopener(urllib.FancyURLopener):
	version = "MWRevisionGrabber1.0"

# This method generates a list of database entries by parsing JSON data from the wikipedia API
# Each entry is in the following form:
# [ page title, page ID, Revision ID, Parent ID, User, UserID, timestamp, comment, diff ]
def entriesFromAPIResponse(opener, jdata):
	# Prepare the return list
	ret = []
	# A time older than any edit -- used as the initial timestamp to compare against
	lasttime = time.strptime("01 Jan 1970", "%d %b %Y")
	
	# Iterate over each revision
	for revision in jdata['query']['pages'].values()[0]['revisions']:
		entry = []
		
		# Check if this result is extraneous due to it coming before the previous result.
		curtime = time.strptime(revision['timestamp'][:-1], "%Y-%m-%dT%H:%M:%S")
		if curtime < lasttime:
			return ret # Terminate, as the extraneous result indicates that there are no more relevant results.
		lasttime = curtime
		
		# Append the article title
		entry.append(jdata['query']['pages'].values()[0]['title'])
		#Append the article ID
		entry.append(jdata['query']['pages'].values()[0]['pageid'])
		# Append the article revision ID
		entry.append(revision['revid'])
		# Append the parent ID
		entry.append(revision['parentid'])
		# Append User Data
		entry.append(revision['user'])
		entry.append(revision['userid'])
		# Append timestamp and edit comment
		entry.append(revision['timestamp'])
		entry.append(revision['comment'])
		
		# Use the wikimedia API to request the diff explicitly.
		
		if (revision['parentid'] != 0):
			fetchdiff = 'http://simple.wikipedia.org/w/api.php?action=compare&format=json&fromrev=%d&torev=%d' % (revision['parentid'], revision['revid'])
			
			s = opener.open(fetchdiff)
			jdiffdata = json.loads(s.read())
			s.close()
			
			entry.append(jdiffdata['compare']['*'])
		else:
			entry.append(revision['*'])
		
		# try:
			# entry.append(revision['diff']['*'])
		# except  KeyError:
			# entry.append("")
		
		# Finally, append the completed entry
		ret.append(entry)
	return ret

# Function to fetch all the article revision data up to a given date / time
# Uses entriesFromAPIResponse to build a list of said revisions
def fetchRevisions(opener, art_title, art_enddate):

	# Common base string for all requests.
	fetchstr_base = ('http://simple.wikipedia.org/w/api.php?'
	'action=query'
	'&prop=revisions'
	'&format=json'
	'&rvprop=ids%7Ctimestamp%7Cuser%7Cuserid%7Ccomment%7Ccontent'
	'&rvlimit=20'
	'&rvdir=newer'
	'&rvdiffto=prev')
	
	# Escape the article title for wikipedia
	title = urllib.quote(art_title)
	#title=art_title
	
	ret = []
	
	#TODO: encode enddate as yymmddhhmmss
	s = opener.open(fetchstr_base + "&titles=%s&rvend=%s"%(art_title, art_enddate))
	jdata = json.loads(s.read())
	s.close()
	
	#if (jdata['query']['pages'].values()[0]['revisions'][0]['*'][:9].upper() == "#REDIRECT"):
	#	print 'Redirect to ' + jdata['query']['pages'].values()[0]['revisions'][0]['*'][12:-2]
	#	return fetchRevisions(opener, jdata['query']['pages'].values()[0]['revisions'][0]['*'][12:-2], art_enddate)
	
	# Add in the entries from the initial fetch
	ret.extend(entriesFromAPIResponse(opener, jdata))
	
	# Continue querying until there is no more data to be had.
	while 'query-continue' in jdata:
		print '\tFetching ~20 more entries . . .'
		s = opener.open(fetchstr_base + "&titles=%s&rvend=%s&rvstartid=%s"%(art_title, art_enddate, jdata['query-continue']['revisions']['rvstartid']))
		jdata = json.loads(s.read())
		s.close()
		ret.extend(entriesFromAPIResponse(opener, jdata))
	
	return ret

def log(info):
	print info
	with open('errorlog.txt', 'a') as log:
		log.write(info + '\n')

def main():
	args = sys.argv
	
	if len(args) != 3:
		print 'Usage: %s "Article Title" start_time_stamp' % args[0]
		quit()
	
	enddate = 0
	
	try:
		enddate = int(args[2])
	except ValueError:
		log('Error! Invalid end date time stamp for the following article:\n')
		log('\t%s (end date %s)\n' % (args[1], args[2]))
		quit()
	
	entries = []
	
	print 'Fetching entries for article %s . . .' % args[1]
	
	try:
		entries = fetchRevisions(MWURLopener(), args[1], enddate)
	except:
		log('Error! Could not fetch revisions for the following article:')
		log('\t%s (end date %d)' % (args[1], enddate))
		quit()
	
	print 'Fetched %d entries.' % len(entries)
	
	print 'Opening SQLite Database . . .'
	try:
		conn = sqlite3.connect('articles.db')
		c = conn.cursor()
	except:
		log('Could not open SQLite database "articles.db"!')
		quit()
	print 'Inserting entries . . .'
	try:
		c.executemany("INSERT INTO articles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", entries)
		conn.commit()
	except:
		log('Error! Could not insert entries for the following article:')
		log('\t%s (end date %d)' % (args[1], enddate))
		quit()
	c.close()
	print 'Done! (Logging completed article.)'
	with open('completed.txt', 'a') as complog:
		complog.write(args[1] + '\n')
	quit()

if __name__ == "__main__":
	main()
	
code.interact("Interactive",local=locals())