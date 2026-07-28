class AppUser {
  const AppUser({
    required this.id,
    required this.username,
    required this.userType,
    this.name,
    this.token,
  });

  final String id;
  final String username;
  final String userType;
  final String? name;
  final String? token;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: '${json['id'] ?? ''}',
      username: '${json['username'] ?? ''}',
      userType: '${json['usertype'] ?? json['userType'] ?? ''}',
      name: json['name']?.toString(),
      token: json['token']?.toString(),
    );
  }
}
