from flask import Flask, redirect, render_template, request, session, jsonify
import mysql.connector
from mysql.connector import Error
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here' #need to see what this is for later
socketio = SocketIO(app) 

# Set sessions to be permanent (not cleared on browser close)
app.config['SESSION_PERMANENT'] = False  # False means the session lasts as long as the browser is open.

@app.route("/")
def index():
    return render_template("homepage.html")

@app.route("/aboutus")
def route1():
    return render_template("aboutus.html")

@app.route("/howitworks")
def route2():
    return render_template("how_it_works.html")

@app.route("/becometutor")
def route3():
    return render_template("become_a_tutor.html")

@app.route("/join")
def route4():
    return render_template("signup.html")

@app.route("/talk")
def route5():
    return render_template("contact.html")



@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "GET":
        return render_template("signup.html")
    elif request.method == "POST":
        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]
        
        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor() #create a cursor that can find things in db

                sql_check = "SELECT * FROM users WHERE email = %s"
                cursor.execute(sql_check, (email,)) #find an account with this email address
                result = cursor.fetchone() #fetches first row (should only be one)

                if result: 
                    cursor.close()
                    connection.close()
                    return redirect("/login") #should find a better way to do this !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! say you aleady have account
            
                else: #doesnt exist
                    sql_insert = "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)"
                    
                    cursor.execute(sql_insert, (name, email, password))
                    connection.commit() #git logic
                    cursor.close()
                    connection.close()
                
                return redirect("/login") #Prevents form resubmission -- goes to next step
        
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("/") # Optionally render an error template or redirect to an error page
        
    return redirect("/") #for anything else than get or post -- not sure it happens a lot at all

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    elif request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        if 'user_id' in session and session['email'] != email: #check to see if when submitting the form again  that the credentials match
            session.clear()  # Clears the session to remove previous login details

        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor()

                sql = "SELECT * FROM users WHERE email = %s AND password = %s"
                cursor.execute(sql, (email, password))
                
                result = cursor.fetchone() #one row
                
                if result:
                    # Login successful
                    session['user_id'] = result[0]  # store data in session array that you can access anywhere
                    session['name'] = result[1]   
                    session['email'] = result[2]
                    cursor.close()
                    connection.close() 

                    return redirect("/hub")  # Redirect to hub 
                else:
                    # Login failed
                    return render_template("login.html", error=True) #need to find a better way of doing this! explain what happenned
        
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("homepage.html")
        
    return redirect("/") #prob will never be needed


#FROM HERE ON, NEED TO BE CAREFUL THAT YOU ARE LOGGED IN BEFORE YOU DO ANYTHING ########################################################### 
# could just type route in and not be logged in (should throw errors anyways cuz sql wont find anything)


@app.route("/hub")
def hub():
    if 'user_id' in session: #check to see if session is active just in case someone types /hub
        name = session["name"]

        return render_template("hub.html", name=name) #customize the hub
    else:
        # If user is not logged in, redirect to login page
        return redirect("/login") #facts chatgbt, you tell em gurl

@app.route("/hub-student")
def hub_student():
    return render_template("hub_student.html", name = session["name"]) #this will through an error if someone tries to /into this. (could put if user in session)


@app.route("/hub-tutor")
def hub_tutor():
    return render_template("hub_tutor.html", name = session["name"]) #this will through an error if someone tries to /into this. (could put if user in session)


@app.route("/tutor-profile", methods=["GET", "POST"])
def tutor_profile():
    if request.method == "GET":
        return render_template("tutor_profile.html")
    elif request.method == "POST":
        if 'user_id' in session: #check to see if session is active just in case someone /hubs 
            age = request.form["age"]
            university = request.form["university"]
            course = request.form["course"]
            about_me = request.form["about_me"]
            subjects = request.form["subjects"]
            availability = request.form["availability"]

            user_id = session["user_id"]
            name = session["name"]

            try:
                # Connect to the database
                connection = mysql.connector.connect(
                    host='localhost',          # e.g., 'localhost' or an IP address
                    user='root',      # your database username
                    password='Kikidi25',  # your database password
                    database='users_tutoring'   # the name of your database
                )
                
                if connection.is_connected():
                    cursor = connection.cursor()

                    sql = "SELECT * FROM tutor_profiles WHERE id_user = %s "
                    cursor.execute(sql, (user_id,))
                    
                    result = cursor.fetchone() #one row
                    
                    if result:  # Profile exists, update it
                        sql = """
                            UPDATE tutor_profiles
                            SET age = %s, university = %s, course = %s, about_me = %s,
                                subjects = %s, availability = %s
                            WHERE id_user = %s
                        """
                        cursor.execute(sql, (age, university, course, about_me, subjects, availability, user_id))
                    else:  # Profile does not exist, insert new
                        sql = """
                            INSERT INTO tutor_profiles (id_user, age, university, course, about_me, subjects, availability)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """
                        cursor.execute(sql, (user_id, age, university, course, about_me, subjects, availability))
                    
                    connection.commit()  # Commit the transaction
                    cursor.close()
                    connection.close()
                    
                    return redirect("/hub-tutor")  # Redirect to hub
                   
            except Error as error_message:
                print(f"Error: {error_message}")
                return render_template("homepage.html")

        else:
            # If user is not logged in, redirect to login page
            return redirect("/login") #facts chatgbt, you tell em gurl
            
        
    return redirect("/") #prob will never be needed


@app.route ("/find-tutor", methods=["GET", "POST"])
def find_tutors():
    if request.method == "GET":
        if 'user_id' in session: #check to see if session is active just in case someone /find-tutors

            try:
                    # Connect to the database
                    connection = mysql.connector.connect(
                        host='localhost',          # e.g., 'localhost' or an IP address
                        user='root',      # your database username
                        password='Kikidi25',  # your database password
                        database='users_tutoring'   # the name of your database
                    )
                    
                    if connection.is_connected():
                        cursor = connection.cursor()

                        query1 = "SELECT DISTINCT subjects FROM tutor_profiles ORDER BY subjects ASC" #give you all distinct subjects for filter
                        query2 = "SELECT DISTINCT university FROM tutor_profiles ORDER BY university ASC" #give you all distinct unis for filter

                        query3 = "SELECT * FROM users JOIN tutor_profiles ON users.id_user = tutor_profiles.id_user" #to give you all the data you need (name is [1] email[2])

                        
                        cursor.execute(query1)
                        subjects = cursor.fetchall() #fetch all rows
        
                        cursor.execute(query2)
                        unis = cursor.fetchall()
                        
                        cursor.execute(query3)
                        tutors = cursor.fetchall()

                        connection.commit()  # Commit the transaction
                        cursor.close()
                        connection.close()

                        # Pass the list of tutors to the template
                        return render_template("find_tutors.html", subjects=subjects, unis=unis, tutors=tutors)
                    
            except Error as error_message:
                print(f"Error: {error_message}")
                return render_template("homepage.html")
            
        else:
            return render_template("/signup.html")

    else:
        return render_template("homepage.html")
    

@app.route('/find-tutor-ajax', methods=['POST'])
def find_tutor_ajax():
    if request.content_type != 'application/json':
        return jsonify({'error': 'Invalid Content-Type. Expected application/json'}), 400

    data = request.get_json()  # Get the JSON data sent from the client
    selected_university = data.get('university', '').strip()  # Get selected university
    selected_subject = data.get('subject', '').strip()  # Get selected subject

    try:
        # Connect to the database
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Kikidi25',
            database='users_tutoring'
        )

        if connection.is_connected():
            cursor = connection.cursor()

            # Prepare the SQL query
            query3 = "SELECT * FROM users JOIN tutor_profiles ON users.id_user = tutor_profiles.id_user WHERE 1=1"
            filters = []

            # Add filters based on user input
            if selected_university:
                query3 += " AND tutor_profiles.university = %s"
                filters.append(selected_university)

            if selected_subject:
                query3 += " AND tutor_profiles.subjects = %s"
                filters.append(selected_subject)

            # Execute the query
            cursor.execute(query3, tuple(filters))
            tutors = cursor.fetchall()

            # Return the data as a JSON response
            return jsonify({'tutors': tutors})

    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@app.route("/like-tutor-ajax", methods=['POST'])
def like_tutor():
    if request.content_type != 'application/json':
        return jsonify({'error': 'Invalid Content-Type. Expected application/json'}), 400
    
    data = request.get_json()  # Get the JSON data sent from the client
    tutor_id = data.get('tutor_id', '').strip()
    user_id = session["user_id"]  # Get user ID from session

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    if not tutor_id:
        return jsonify({'error': 'No tutor ID provided'}), 400

    try:
        # Connect to the database
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Kikidi25',
            database='users_tutoring'
        )

        if connection.is_connected():
            cursor = connection.cursor()

            # Check if the user has already liked the tutor
            check_query = '''SELECT * FROM liked_tutors WHERE id_user = %s AND id_tutor = %s'''
            cursor.execute(check_query, (user_id, tutor_id))
            result = cursor.fetchone()

            if result:
                # Tutor is already liked, possibly unlike or update
                delete_query = '''DELETE FROM liked_tutors WHERE id_user = %s AND id_tutor = %s'''
                cursor.execute(delete_query, (user_id, tutor_id))
                connection.commit()

                return jsonify({'message': 'Tutor like removed'}), 200
            else:
                # Tutor is not liked, insert a new record
                insert_query = '''INSERT INTO liked_tutors (id_user, id_tutor, liked) VALUES (%s, %s, %s)'''
                cursor.execute(insert_query, (user_id, tutor_id, 1))
                connection.commit()

                return jsonify({'message': 'Tutor liked successfully'}), 201

    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@app.route("/tutor-info", methods=["GET"])
def tutor_info():
    tutor_id = request.args.get('tutor_id')  # Get the tutor_id from the URL
    try:
        # Connect to the database
        connection = mysql.connector.connect(
            host='localhost',          # e.g., 'localhost' or an IP address
            user='root',      # your database username
            password='Kikidi25',  # your database password
            database='users_tutoring'   # the name of your database
        )
        
        if connection.is_connected():
            cursor = connection.cursor()

            query = "SELECT * FROM users JOIN tutor_profiles ON users.id_user = tutor_profiles.id_user WHERE id_tutor = %s" #gives you info on tutor

            cursor.execute(query, (tutor_id,))
            tutor_info = cursor.fetchone()

            connection.commit()  # Commit the transaction
            cursor.close()
            connection.close()
            # we need like for tutor in distinct tutor_id whatever and then use jinja to fix it yeah...
            # Pass the list of tutors to the template
            print(tutor_info)
            return render_template('tutor_info.html', tutor_info=tutor_info)
            
            
    except Error as error_message:
        print(f"Error: {error_message}")
        return render_template("homepage.html")
    

from flask import request, jsonify

@app.route("/make-tutor-active", methods=["POST"])
def make_tutor_active():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "Not logged in"}), 403

    data = request.get_json()
    tutor_id = data.get("tutor_id")

    if not tutor_id:
        return jsonify({"success": False, "message": "Missing tutor ID"}), 400

    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Kikidi25",
            database="users_tutoring"
        )
        cursor = connection.cursor()

        # Insert tutor into active_tutors (ignore if duplicate)
        query = """
            INSERT INTO active_tutors (id_user, id_tutor)
            VALUES (%s, %s)
        """
        cursor.execute(query, (user_id, tutor_id))
        connection.commit()

        return jsonify({"success": True, "message": "Tutor has been added to your Active Tutors."})

    except Error as e:
        print(f"DB error: {e}")
        return jsonify({"success": False, "message": "Database error"}), 500

    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()


@app.route("/active-tutors", methods=["GET"])
def active_tutors():
    user_id = session.get("user_id")
    if not user_id:
        return redirect("/login")  # or wherever your login page is

    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Kikidi25",
            database="users_tutoring"
        )
        cursor = connection.cursor(dictionary=True)

        # Join active_tutors -> tutor_profiles -> users to get tutor info
        query = """
            SELECT tp.id_tutor, tp.age, tp.university, tp.course, 
                   tp.about_me, tp.subjects, tp.availability, u.name AS tutor_name
            FROM active_tutors at
            JOIN tutor_profiles tp ON at.id_tutor = tp.id_tutor
            JOIN users u ON tp.id_user = u.id_user
            WHERE at.id_user = %s
        """
        cursor.execute(query, (user_id,))
        active_tutors_list = cursor.fetchall()

        cursor.close()
        connection.close()

        return render_template("active_tutors.html", active_tutors=active_tutors_list)

    except mysql.connector.Error as e:
        print("DB error:", e)
        return "Database error", 500



@app.route("/messages", methods=["GET", "POST"])
def messages():
    if request.method == "GET":
        receiver_user_id = session["user_id"]
        
        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor()

                query = """SELECT messages.*, users.name AS sender_name
                            FROM messages
                            JOIN users ON messages.id_receiver = users.id_user
                            WHERE messages.id_receiver = %s OR messages.id_sender = %s
                            ORDER BY messages.message_timestamp DESC
                            """ #give you all messages ordered by person

                cursor.execute(query, (receiver_user_id, receiver_user_id))
                messages = cursor.fetchall()


                # Initialize a dictionary to group messages by sender_id
                grouped_messages = {}

                for message in messages:
                    receiver_id = message[2]  # assuming message[1] is the sender_id
                    if receiver_id not in grouped_messages:
                        grouped_messages[receiver_id] = []  # Initialize an empty list for the sender if it doesn't exist
                    grouped_messages[receiver_id].append(message)

                connection.commit()  # Commit the transaction

                cursor.close()
                connection.close()


                # Pass the grouped messages to the template -- which is a dict of lists {4 : [(...), (...)]}
                return render_template("messages.html", grouped_messages=grouped_messages)
            
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("homepage.html")
        
    #need to start chaginginhere ##################################################################################
    elif request.method == "POST":
       
        sender_user_id = session.get("user_id")

        if request.content_type != 'application/json':
            return jsonify({'error': 'Invalid Content-Type. Expected application/json'}), 400

        data = request.get_json()
        receiver_user_id = data.get('receiver_id', '').strip()
        message_content = data.get('message', '').strip()

        try:
            connection = mysql.connector.connect(
                host='localhost',
                user='root',
                password='Kikidi25',
                database='users_tutoring'
            )

            if not connection.is_connected():
                return jsonify({'error': 'Failed to connect to DB'}), 500

            cursor = connection.cursor()

            if message_content:
                # INSERT message
                query = "INSERT INTO messages (message, id_sender, id_receiver) VALUES (%s, %s, %s)"
                cursor.execute(query, (message_content, sender_user_id, receiver_user_id))
                connection.commit()

                # Real-time update
                socketio.emit('new_message', {
                    'sender_id': sender_user_id,
                    'receiver_id': receiver_user_id,
                    'message_content': message_content,
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })

                return jsonify({'status': 'success'}), 200

            else:
                # FETCH messages
                query = "SELECT * FROM messages WHERE id_receiver = %s AND id_sender = %s OR id_receiver = %s AND id_sender = %s ORDER BY message_timestamp DESC"
                cursor.execute(query, (receiver_user_id, sender_user_id, sender_user_id, receiver_user_id))
                messages = cursor.fetchall()
                return jsonify({'messages': messages})

        except mysql.connector.Error as err:
            return jsonify({'error': str(err)}), 500

        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
    


@app.route('/send-message', methods=["GET", "POST"])
def send_message():
    if request.method == "GET":
        receiver_id = request.args.get('tutor_id')  # Get the tutor_id from the URL
        sender_id = session["user_id"]
        print(receiver_id)
        
        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor()
                query = "SELECT * FROM messages WHERE id_sender = %s AND id_receiver = %s ORDER BY message_timestamp DESC"

                cursor.execute(query, (sender_id, receiver_id))  #need to add message to database, but also need to update it live for the user in case they are using platform and need to receive message while they are there.
                messages = cursor.fetchall()

                connection.commit()  # Commit the transaction
                cursor.close()
                connection.close()
                
                return render_template("send_message.html", messages = messages , receiver_id = receiver_id)

        except Error as error_message:
            print(f"Error: {error_message}")
            redirect("/homepage")
    elif request.method == "POST":
        data = request.get_json()  # Get the JSON data from the request
        receiver_id = data.get('receiver_id').strip()  # Extract receiver_id from the JSON data
        message_content = data.get('message').strip()  # Extract message_content from the JSON data
        sender_id = session.get("user_id")      # Get sender ID from session

        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',
                user='root',
                password='Kikidi25',
                database='users_tutoring'
            )

            if connection.is_connected():
                cursor = connection.cursor()
                query = "INSERT INTO messages (message, id_sender, id_receiver) VALUES (%s, %s, %s)"
                cursor.execute(query, (message_content, sender_id, receiver_id))  # Insert message into the database
            
                connection.commit()  # Commit the transaction
                cursor.close()
                connection.close()

                # Emit the new message
                socketio.emit('new_message', {
                    'sender_id': sender_id,
                    'message_content': message_content,
                    'receiver_id': receiver_id
                })

                return jsonify({'status': 'success'}), 200  # Return a JSON response

        except Error as error_message:
            print(f"Error: {error_message}")
            return redirect("/homepage")
    



@app.route("/liked-tutors")
def routelikedtutors():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("homepage"))

    liked_tutors = []

    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Kikidi25",
            database="users_tutoring"   # ✅ make sure this is correct
        )

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT tp.id_tutor,
                u.name AS tutor_name,
                tp.age,
                tp.university,
                tp.course,
                tp.about_me,
                tp.subjects,
                tp.availability
            FROM liked_tutors lt
            JOIN tutor_profiles tp ON lt.id_tutor = tp.id_tutor
            JOIN users u ON tp.id_user = u.id_user
            WHERE lt.id_user = %s AND lt.liked = %s
        """
        cursor.execute(query, (user_id, 1))
        liked_tutors = cursor.fetchall()
        print(liked_tutors)

    except Error as error_message:
        print(f"Database error: {error_message}")
        return redirect(url_for("homepage"))

    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

    return render_template("liked_tutors.html", liked_tutors=liked_tutors)



@app.route("/dashboard")
def routedash():
    return render_template("dashboard.html")











@app.route("/calendar")
def calendar():
    user_id = session["user_id"]  # logged-in user

    try:
        # Connect to the database
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Kikidi25',
            database='users_tutoring'
        )

        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)  # dict results for easier template use

            query = """
                SELECT events.*, tutor_profiles.id_tutor, student_profiles.id_student
                FROM events
                LEFT JOIN tutor_profiles ON events.tutor_id = tutor_profiles.id_tutor
                LEFT JOIN student_profiles ON events.student_id = student_profiles.id_student
                WHERE events.user_id = %s
                ORDER BY events.start_time ASC
            """
            cursor.execute(query, (user_id,))
            events = cursor.fetchall()

            cursor.close()
            connection.close()

            return render_template("calendar.html", events=events)

    except Error as error_message:
        print(f"Error: {error_message}")
        return render_template("calendar.html", events=[])

# When a user connects, join their personal room
@socketio.on("join_calendar")
def join_calendar(data):
    user_id = session.get("user_id")
    if not user_id:
        return
    join_room(f"user_{user_id}")  # their personal room
    print(f"User {user_id} joined room user_{user_id}")

@socketio.on("create_event")
def create_event(data):
    user_id = session.get("user_id")
    if not user_id:
        emit("error", {"msg": "not authenticated"})
        return

    title = data.get("title", "Session")
    start = data.get("start")
    end = data.get("end")
    tutor_id = data.get("tutor_id")  # optional
    student_id = data.get("student_id")  # optional

    try:
        # Connect to the database (same as first try block)
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Kikidi25',
            database='users_tutoring'
        )

        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO events (user_id, tutor_id, student_id, title, start_time, end_time, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user_id, tutor_id, student_id, title, start, end, "pending"))
            connection.commit()
            event_id = cursor.lastrowid
            cursor.close()
            connection.close()

            event = {"id": event_id, "title": title, "start": start, "end": end}

            # Emit only to relevant rooms: creator + tutor + student
            emit("event_created", event, room=f"user_{user_id}")
            if tutor_id and tutor_id != user_id:
                emit("event_created", event, room=f"user_{tutor_id}")
            if student_id and student_id != user_id:
                emit("event_created", event, room=f"user_{student_id}")

    except Error as e:
        print("DB error:", e)
        emit("error", {"msg": "db error"})










@app.route("/create-event")
def createevent():
    return render_template("create_event.html")

